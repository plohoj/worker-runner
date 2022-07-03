import { ActionController } from '../../action-controller/action-controller';
import { ArgumentsDeserializer } from '../../arguments-serialization/arguments-deserializer';
import { ArgumentsSerializer } from '../../arguments-serialization/arguments-serializer';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { IRunnerMessageConfig, WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ErrorSerializer } from '../../errors/error.serializer';
import { ConnectionWasClosedError, RunnerDestroyError, RunnerExecuteError, RunnerInitError, RunnerNotFound } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { RunnerController, RUNNER_ENVIRONMENT_CLIENT } from '../../runner/runner.controller';
import { ActionHandler, IActionWithId } from '../../types/action';
import { IRunnerMethodResult, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { DisconnectErrorFactory } from '../../types/disconnect-error-factory';
import { TransferableJsonLike } from '../../types/json-like';
import { RunnerToken, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { IRunnerSerializedArgument } from '../../types/runner-serialized-argument';
import { allPromisesCollectErrors } from '../../utils/all-promises-collect-errors';
import { PromiseInterrupter } from '../../utils/promise-interrupter';
import { TransferRunnerData } from '../../utils/transfer-runner-data';
import { IRunnerEnvironmentClientAction, IRunnerEnvironmentClientExecuteAction, IRunnerEnvironmentClientTransferAction, RunnerEnvironmentClientAction } from '../client/runner-environment.client.actions';
import { IRunnerEnvironmentClientCollectionConfig, RunnerEnvironmentClientCollection } from '../client/runner-environment.client.collection';
import { IRunnerEnvironmentHostOwnMetadataAction, IRunnerEnvironmentHostClonedAction, RunnerEnvironmentHostAction, IRunnerEnvironmentHostErrorAction, IRunnerEnvironmentHostExecutedAction, IRunnerEnvironmentHostExecutedWithRunnerResultAction, IRunnerEnvironmentHostDestroyedAction, IRunnerEnvironmentHostDisconnectedAction } from './runner-environment.host.actions';

interface IRunnerEnvironmentHostSyncInitConfig<R extends RunnerConstructor> {
    runnerInstance: InstanceType<R>,
}

interface IRunnerEnvironmentHostAsyncInitConfig {
    arguments: IRunnerSerializedArgument[],
}
export interface IRunnerEnvironmentHostConfig {
    token: RunnerToken;
    connectionChannel: BaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyHost,
    argumentSerializer: ArgumentsSerializer;
    argumentDeserializer: ArgumentsDeserializer;
    errorSerializer: ErrorSerializer;
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    onDestroyed: () => void;
}

export interface IRunnerEnvironmentHostActionControllerConnectData {
    handler: ActionHandler<IRunnerEnvironmentClientAction & IActionWithId>;
    /** Action Initiated was received for ActionControllers */
    isInitiated?: boolean;
    interrupter: PromiseInterrupter;
} 

const WAIT_FOR_RESPONSE_DESTROYED_ACTION_TIMEOUT = 10_000;

export class RunnerEnvironmentHost<R extends RunnerConstructor> {

    protected readonly errorSerializer: ErrorSerializer;
    
    private readonly token: RunnerToken;
    private readonly connectDataMap = new Map<ActionController, IRunnerEnvironmentHostActionControllerConnectData>();
    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    private readonly runnerEnvironmentClientCollection: RunnerEnvironmentClientCollection<RunnerIdentifierConfigList>;
    private readonly argumentSerializer: ArgumentsSerializer;
    private readonly argumentDeserializer: ArgumentsDeserializer;
    private readonly connectionStrategy: BaseConnectionStrategyHost;
    private readonly onDestroyed: () => void;

    private _runnerInstance?: InstanceType<R>;

    constructor(config: Readonly<IRunnerEnvironmentHostConfig>) {
        this.token = config.token;
        this.errorSerializer = config.errorSerializer;
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.argumentSerializer = config.argumentSerializer;
        this.argumentDeserializer = config.argumentDeserializer;
        this.connectionStrategy = config.connectionStrategy;
        this.runnerEnvironmentClientCollection = this.buildRunnerEnvironmentClientCollection({
            errorSerializer: this.errorSerializer,
            argumentSerializer: this.argumentSerializer,
            connectionStrategy: this.connectionStrategy.strategyClient,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
        });
        this.onDestroyed = config.onDestroyed;
        this.startHandleConnectionChannel(config.connectionChannel);
    }

    public get runnerInstance(): InstanceType<R> {
        if (!this._runnerInstance) {
            throw new ConnectionWasClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED(
                    this.getErrorMessageConfig(),
                ),
            });
        }
        return this._runnerInstance;
    }
    public set runnerInstance(value: InstanceType<R>) {
        this._runnerInstance = value;
    }

    /**
     * Waiting for any event to resubmit the Disconnect action
     * 
     * It assumes that the {@link ActionController} has already been initialized
     * by calling the {@link ActionController.run} method.
     */
    public static waitAndResponseDestroyedAction(actionController: ActionController) {
        function destroyActionByTimeout(): void {
            actionController.destroy();
            console.warn('Timeout waiting for an action from the Environment client to resubmit the Destroy action');
        }
        const timeoutKey = setTimeout(destroyActionByTimeout, WAIT_FOR_RESPONSE_DESTROYED_ACTION_TIMEOUT);
        function afterDisconnectHandler(): void {
            actionController.sendAction<IRunnerEnvironmentHostDestroyedAction>({
                type: RunnerEnvironmentHostAction.DESTROYED,
            });
            actionController.destroy();
            clearTimeout(timeoutKey);
        }
        actionController.addActionHandler(afterDisconnectHandler);
    }

    public initSync(config: IRunnerEnvironmentHostSyncInitConfig<R>): void {
        this.runnerInstance = config.runnerInstance
    }

    public async initAsync(config: IRunnerEnvironmentHostAsyncInitConfig): Promise<void> {
        let runnerInstance: InstanceType<R>;
        const runnerConstructor = this.runnerIdentifierConfigCollection.getRunnerConstructor(this.token);
        const deserializedArgumentsData = await this.argumentDeserializer.deserializeArguments({
            arguments: config.arguments,
            runnerEnvironmentClientPartFactory: this.runnerEnvironmentClientCollection.runnerEnvironmentClientPartFactory,
            combinedErrorsFactory: (errors: unknown[]) => new RunnerInitError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR(this.getErrorMessageConfig()),
                originalErrors: errors,
            }),
        });
        this.runnerEnvironmentClientCollection.add(...deserializedArgumentsData.environments);
        try {
            runnerInstance = new runnerConstructor(...deserializedArgumentsData.arguments) as InstanceType<R>;
        } catch (error) {
            const possibleErrors = await allPromisesCollectErrors(
                deserializedArgumentsData.environments
                    .map(controller => controller.disconnect())
            );
            // TODO NEED TEST About delete controller if ResolvedRunner was disconnected / destroyed in constructor 
            this.runnerEnvironmentClientCollection.delete(...deserializedArgumentsData.environments);
            if ('errors' in possibleErrors) {
                throw new RunnerInitError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR(
                        this.getErrorMessageConfig(),
                    ),
                    originalErrors: [
                        error,
                        ...possibleErrors.errors,
                    ]
                });
            }
            throw error;
        }
        this.initSync({ runnerInstance });
    }

    public async handleExecuteAction(
        actionController: ActionController,
        action: IRunnerEnvironmentClientExecuteAction & IActionWithId,
    ): Promise<void> {
        let methodResult: IRunnerMethodResult;
        const deserializedArgumentsData = await this.argumentDeserializer.deserializeArguments({
            arguments: action.args,
            runnerEnvironmentClientPartFactory: this.runnerEnvironmentClientCollection.runnerEnvironmentClientPartFactory,
            combinedErrorsFactory: (errors: unknown[]) => new RunnerExecuteError({
                message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR(this.getErrorMessageConfig()),
                originalErrors: errors,
            }),
        });
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const notAwaitedResult: IRunnerMethodResult | Promise<IRunnerMethodResult>
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                = this.runnerInstance[action.method](...deserializedArgumentsData.arguments);
            methodResult = notAwaitedResult instanceof Promise
                ? (await Promise.race([
                    notAwaitedResult,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this.connectDataMap.get(actionController)!.interrupter.promise,
                ]))
                : notAwaitedResult;
        } catch (error: unknown) {
            if (error instanceof PromiseInterrupter) {
                return;
            }
            const possibleErrors = await allPromisesCollectErrors(
                deserializedArgumentsData.environments
                    .map(controller => controller.disconnect())
            );
            if ('errors' in possibleErrors) {
                throw new RunnerExecuteError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR({
                        ...this.getErrorMessageConfig(),
                        methodName: action.method,
                    }),
                    originalErrors: [
                        error,
                        ...possibleErrors.errors,
                    ]
                });
            }
            throw this.errorSerializer.normalize(error, RunnerExecuteError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR({
                    ...this.getErrorMessageConfig(),
                    methodName: action.method,
                }),
            });
        }
        this.runnerEnvironmentClientCollection.add(...deserializedArgumentsData.environments);
        await this.handleExecuteResponse(actionController, action, methodResult);
    }

    public handleDestroy(): Promise<void>;
    public handleDestroy(actionController: ActionController, actionId: number): Promise<void>;
    public async handleDestroy(actionController?: ActionController, actionId?: number): Promise<void> {
        let caughtError: unknown | undefined;
        try {
            if (this.runnerInstance.destroy) {
                await (this.runnerInstance.destroy as () => void | Promise<void>)();
            }
        } catch(error: unknown) {
            caughtError = this.errorSerializer.normalize(error, RunnerDestroyError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(
                    this.getErrorMessageConfig(),
                ),
            }) ;
        }
        const possibleErrors = await allPromisesCollectErrors(
            [...this.runnerEnvironmentClientCollection.runnerEnvironmentClients]
                .map(controller => controller.disconnect()),
        );
        this.runnerEnvironmentClientCollection.runnerEnvironmentClients.clear();
        actionController?.sendActionResponse<IRunnerEnvironmentHostDestroyedAction>({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            id: actionId!,
            type: RunnerEnvironmentHostAction.DESTROYED,
        });
        for (const [iteratedActionController] of this.connectDataMap) {
            if (iteratedActionController !== actionController) {
                iteratedActionController.sendAction<IRunnerEnvironmentHostDestroyedAction>({
                    type: RunnerEnvironmentHostAction.DESTROYED,
                });
            }
            // TODO Move into the Connection Strategy a check for the need to send an Initiated action
            // and waiting for any event to resubmit the Disconnect action
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            if (!this.connectDataMap.get(iteratedActionController)!.isInitiated) {
                RunnerEnvironmentHost.waitAndResponseDestroyedAction(iteratedActionController);
            } else {
                iteratedActionController.destroy();
            }
        }
        this.connectDataMap.clear();
        this.onDestroyed();
        if ('errors' in possibleErrors) {
            const originalErrors = new Array<unknown>();
            if (caughtError) {
                originalErrors.push(caughtError);
            }
            originalErrors.push(...possibleErrors.errors);
            throw new RunnerDestroyError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(
                    this.getErrorMessageConfig(),
                ),
                originalErrors,
            });
        }
        if (caughtError) {
            throw caughtError;
        }
    }

    /**
     * The method is called if the initialization ({@link initAsync}) was not successful. The method must:
     * * Destroy initialized data;
     * * Stop listening to actions;
     * * Call {@link ActionController.destroy} method
     */
    public cancel(): void {
        for (const [iteratedActionController] of this.connectDataMap) {
            iteratedActionController.destroy();
        }
        this.connectDataMap.clear();
    }

    protected async handleDisconnect(actionController: ActionController, actionId: number): Promise<void> {
        if (this.connectDataMap.size <= 1) {
            await this.handleDestroy(actionController, actionId);
            return;
        } else {
            actionController.sendActionResponse<IRunnerEnvironmentHostDisconnectedAction>({
                type: RunnerEnvironmentHostAction.DISCONNECTED,
                id: actionId,
            });
            this.connectDataMap.delete(actionController);
            actionController.destroy();
        }
    }

    protected getErrorMessageConfig(): IRunnerMessageConfig {
        return {
            token: this.token,
            runnerName: this._runnerInstance?.constructor.name
                || this.runnerIdentifierConfigCollection.getRunnerConstructorSoft(this.token)?.name,
        }
    }

    protected async handleAction(
        actionController: ActionController,
        action: Exclude<IRunnerEnvironmentClientAction, IRunnerEnvironmentClientTransferAction> & IActionWithId
            | IRunnerEnvironmentClientTransferAction,
    ): Promise<void> {
        try {
            switch (action.type) {
                case RunnerEnvironmentClientAction.INITIATED:
                    this.handleInitiatedAction(actionController);
                    break;
                case RunnerEnvironmentClientAction.EXECUTE:
                    await this.handleExecuteAction(actionController, action);
                    break
                case RunnerEnvironmentClientAction.CLONE:
                    this.handleCloneAction(actionController, action.id);
                    break;
                case RunnerEnvironmentClientAction.OWN_METADATA:
                    this.handleOwnMetadataAction(actionController, action.id);
                    break;
                case RunnerEnvironmentClientAction.TRANSFER:
                    // TODO rxjs should unsubscribe
                    this.handleTransferAction(actionController);
                    break;
                case RunnerEnvironmentClientAction.DISCONNECT:
                    await this.handleDisconnect(actionController, action.id)
                    break;
                case RunnerEnvironmentClientAction.DESTROY:
                    await this.handleDestroy(actionController, action.id);
                    break;
                default:
                    throw new WorkerRunnerUnexpectedError({
                        message: 'Unexpected Action type for Runner environment host',
                    });
            }
        } catch (error) {
            if ('id' in action) {
                const serializedError = this.errorSerializer.serialize(
                    this.errorSerializer.normalize(
                        error,
                        WorkerRunnerUnexpectedError,
                        {
                            message: WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR(this.getErrorMessageConfig())
                        },
                    ),
                );
                actionController.sendActionResponse<IRunnerEnvironmentHostErrorAction>({
                    type: RunnerEnvironmentHostAction.ERROR,
                    id: action.id,
                    error: serializedError,
                });
            } else {
                throw error;
            }
        }
    }

    protected async handleExecuteResponse(
        actionController: ActionController,
        action: IRunnerEnvironmentClientExecuteAction & IActionWithId,
        methodResult: IRunnerMethodResult,
    ): Promise<void> {
        if (RunnerController.isRunnerController(methodResult)) {
            const runnerEnvironmentClient = methodResult[RUNNER_ENVIRONMENT_CLIENT];
            const preparedData = await this.connectionStrategy.strategyClient
                .prepareRunnerForSend(runnerEnvironmentClient);
            const runnerResultAction: IRunnerEnvironmentHostExecutedWithRunnerResultAction & IActionWithId = {
                type: RunnerEnvironmentHostAction.EXECUTED_WITH_RUNNER_RESULT,
                id: action.id,
                token: runnerEnvironmentClient.token,
            };
            if (preparedData) {
                Object.assign(runnerResultAction, preparedData.attachData);
            }
            actionController.sendActionResponse(runnerResultAction, preparedData?.transfer)
        } else {
            let response: IRunnerSerializedMethodResult;
            const transfer: Transferable[] = [];
            if (methodResult instanceof TransferRunnerData) {
                transfer.push(...methodResult.transfer);
                response = methodResult.data;
            } else {
                response = methodResult;
            }
            actionController.sendActionResponse<IRunnerEnvironmentHostExecutedAction>({
                type: RunnerEnvironmentHostAction.EXECUTED,
                id: action.id,
                response: response as TransferableJsonLike,
            }, transfer);
        }
    }

    protected buildRunnerEnvironmentClientCollection(
        config: IRunnerEnvironmentClientCollectionConfig<RunnerIdentifierConfigList>
    ): RunnerEnvironmentClientCollection<RunnerIdentifierConfigList> {
        return new RunnerEnvironmentClientCollection(config);
    }

    private handleInitiatedAction(actionController: ActionController) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.connectDataMap.get(actionController)!.isInitiated = true;
    }

    private handleTransferAction(actionController: ActionController) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.connectDataMap.get(actionController)!.interrupter.interrupt();
    }

    private handleCloneAction(actionController: ActionController, actionId: number): void {
        const clonedAction: IRunnerEnvironmentHostClonedAction & IActionWithId = {
            type: RunnerEnvironmentHostAction.CLONED,
            id: actionId,
        };
        const preparedData = this.connectionStrategy.prepareClonedRunnerForSend(this);
        Object.assign(clonedAction, preparedData.attachData);
        this.startHandleConnectionChannel(preparedData.connectionChannel);
        actionController.sendActionResponse(clonedAction, preparedData.transfer);
    }

    private disconnectErrorFactory: DisconnectErrorFactory = (error: ConnectionWasClosedError): ConnectionWasClosedError => 
        new ConnectionWasClosedError({
            // eslint-disable-next-line @typescript-eslint/unbound-method
            captureOpt: this.disconnectErrorFactory,
            ...error,
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED(this.getErrorMessageConfig())
        });

    private startHandleConnectionChannel(
        connectionChannel: BaseConnectionChannel,
    ): void {
        const actionController = new ActionController({
            connectionChannel,
            disconnectErrorFactory: this.disconnectErrorFactory,
        });
        const handler = this.handleAction.bind(this, actionController);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        actionController.addActionHandler(handler);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.connectDataMap.set(actionController, {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            handler,
            interrupter: new PromiseInterrupter(),
        });
        actionController.run();
    }

    private handleOwnMetadataAction(actionController: ActionController, actionId: number): void {
        let methodsNames: string[];
        try {
            methodsNames = this.runnerIdentifierConfigCollection.getRunnerMethodsNames(this.token)
        } catch (error) { // TODO NEED TEST
            throw this.errorSerializer.normalize(error, RunnerNotFound, {
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND(
                    this.getErrorMessageConfig(),
                ),
            });
        }
        actionController.sendActionResponse<IRunnerEnvironmentHostOwnMetadataAction>({
            type: RunnerEnvironmentHostAction.OWN_METADATA,
            id: actionId,
            methodsNames,
        });
    }
}
