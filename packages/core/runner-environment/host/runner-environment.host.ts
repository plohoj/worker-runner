import { ActionController } from '../../action-controller/action-controller';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { IRunnerMessageConfig, WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { normalizeError } from '../../errors/normalize-error';
import { ConnectionClosedError, RunnerDestroyError, RunnerExecuteError, RunnerInitError, RunnerNotFound } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { ErrorSerializationPluginsResolver } from '../../plugins/error-serialization-plugin/base/error-serialization-plugins.resolver';
import { PluginsResolver } from '../../plugins/resolver/plugins.resolver';
import { ARRAY_TRANSFER_TYPE } from '../../plugins/transfer-plugin/array-transfer-plugin/array-transfer-plugin-data';
import { ITransferPluginReceivedData, TransferPluginDataType, TransferPluginSendData } from '../../plugins/transfer-plugin/base/transfer-plugin-data';
import { ITransferPluginsResolverReceiveDataConfig, TransferPluginsResolver } from '../../plugins/transfer-plugin/base/transfer-plugins.resolver';
import { ITransferPluginControllerTransferDataConfig } from '../../plugins/transfer-plugin/base/transfer.plugin-controller';
import { ICollectionTransferPluginSendArrayData } from '../../plugins/transfer-plugin/collection-transfer-plugin/collection-transfer-plugin-data';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { ActionHandler, IActionWithId } from '../../types/action';
import { IRunnerMethodResult, RunnerConstructor } from '../../types/constructor';
import { DisconnectErrorFactory } from '../../types/disconnect-error-factory';
import { RunnerToken } from "../../types/runner-identifier";
import { WorkerRunnerIdentifier } from '../../utils/identifier-generator';
import { parallelPromises } from '../../utils/parallel.promises';
import { PromiseInterrupter } from '../../utils/promise-interrupter';
import { rowPromisesErrors } from '../../utils/row-promises-errors';
import { RunnerEnvironmentClient } from '../client/runner-environment.client';
import { IRunnerEnvironmentClientAction, IRunnerEnvironmentClientExecuteAction, IRunnerEnvironmentClientTransferAction, RunnerEnvironmentClientAction } from '../client/runner-environment.client.actions';
import { RunnerEnvironmentClientCollection } from '../client/runner-environment.client.collection';
import { IRunnerEnvironmentHostClonedAction, IRunnerEnvironmentHostDestroyedAction, IRunnerEnvironmentHostDisconnectedAction, IRunnerEnvironmentHostErrorAction, IRunnerEnvironmentHostExecutedAction, IRunnerEnvironmentHostOwnMetadataAction, RunnerEnvironmentHostAction } from './runner-environment.host.actions';

interface IRunnerEnvironmentHostSyncInitConfig<R extends RunnerConstructor> {
    runnerInstance: InstanceType<R>,
    connectionChannel: BaseConnectionChannel;
}

interface IRunnerEnvironmentHostAsyncInitConfig {
    arguments: ICollectionTransferPluginSendArrayData,
    connectionChannel: BaseConnectionChannel;
}

export interface IRunnerEnvironmentHostConfig {
    token: RunnerToken;
    connectionStrategy: BaseConnectionStrategyHost,
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection;
    pluginsResolver: PluginsResolver;
    onDestroyed: () => void;
}

export interface IRunnerEnvironmentHostActionControllerConnectData {
    /** Action Initiated was received for ActionControllers */
    isInitiated?: boolean;
    interrupter: PromiseInterrupter;
    handler: ActionHandler<IRunnerEnvironmentClientAction & IActionWithId>;
}

export interface IRunnerEnvironmentHostDestroyActionTrigger {
    actionController: ActionController;
    actionId: WorkerRunnerIdentifier;
}

export interface IRunnerEnvironmentHostDestroyProcessData {
    promise$?: Promise<void>;
    actionTriggers: IRunnerEnvironmentHostDestroyActionTrigger[];
}

const WAIT_FOR_RESPONSE_DESTROYED_ACTION_TIMEOUT = 10_000;

export class RunnerEnvironmentHost<R extends RunnerConstructor = RunnerConstructor> {

    public readonly connectionStrategy: BaseConnectionStrategyHost;
    
    private readonly token: RunnerToken;
    private readonly connectDataMap = new Map<ActionController, IRunnerEnvironmentHostActionControllerConnectData>();
    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection;
    private readonly environmentClientCollection = new RunnerEnvironmentClientCollection();
    private readonly errorSerialization: ErrorSerializationPluginsResolver;
    private readonly transferPluginsResolver: TransferPluginsResolver;
    private readonly onDestroyed: () => void;

    private _runnerInstance?: InstanceType<R>;
    private destroyProcess?: IRunnerEnvironmentHostDestroyProcessData;

    constructor(config: Readonly<IRunnerEnvironmentHostConfig>) {
        this.token = config.token;
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.connectionStrategy = config.connectionStrategy;
        const pluginsResolver = config.pluginsResolver;
        this.errorSerialization = pluginsResolver.errorSerialization;
        this.onDestroyed = config.onDestroyed;
        this.transferPluginsResolver = pluginsResolver.resolveTransferResolver({
            runnerEnvironmentClientFactory: RunnerEnvironmentClient.buildFactory({
                connectionStrategy: this.connectionStrategy.strategyClient,
                environmentCollection: this.environmentClientCollection,
                pluginsResolver: config.pluginsResolver,
                runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            }),
        });
    }

    public get runnerInstance(): InstanceType<R> {
        if (!this._runnerInstance) {
            throw new ConnectionClosedError({
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
        this.runnerInstance = config.runnerInstance;
        const actionController = this.initActionController(config.connectionChannel);
        this.startHandleActionController(actionController);
    }

    public async initAsync(config: IRunnerEnvironmentHostAsyncInitConfig): Promise<void> {
        let runnerInstance: InstanceType<R>;
        const actionController = this.initActionController(config.connectionChannel);
        const receiveDataConfig: ITransferPluginsResolverReceiveDataConfig = {
            actionController,
            data: config.arguments as unknown as TransferPluginSendData,
            type: ARRAY_TRANSFER_TYPE,
        };
        let runnerConstructor: RunnerConstructor;

        try {
            runnerConstructor = this.runnerIdentifierConfigCollection.getRunnerConstructor(this.token);
        } catch (notFoundConstructorError) {
            try {
                await this.transferPluginsResolver.cancelReceiveData(receiveDataConfig);
            } catch (cancelError) {
                throw new RunnerInitError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR(this.getErrorMessageConfig()),
                    originalErrors: [
                        notFoundConstructorError,
                        cancelError,
                    ],
                });
            } finally {
                actionController.destroy();
            }
            throw notFoundConstructorError;
        }

        let receivedData: ITransferPluginReceivedData;
        try {
            receivedData = await this.transferPluginsResolver.receiveData(receiveDataConfig);
        } catch(error) {
            actionController.destroy();
            throw error
        }

        try {
            runnerInstance = new runnerConstructor(...receivedData.data as unknown as unknown[]) as InstanceType<R>;
        } catch (constructError) {
            try {
                await receivedData.cancel?.();
            } catch (cancelError) {
                throw new RunnerInitError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR(this.getErrorMessageConfig()),
                    originalErrors: [
                        constructError,
                        cancelError,
                    ],
                });
            } finally {
                actionController.destroy();
            }
            throw constructError;
        }
        this.runnerInstance = runnerInstance;
        this.startHandleActionController(actionController);
    }

    public async handleExecuteAction(
        actionController: ActionController,
        action: IRunnerEnvironmentClientExecuteAction & IActionWithId,
    ): Promise<void> {
        const receiveDataConfig: ITransferPluginsResolverReceiveDataConfig = {
            actionController,
            data: action.args as unknown as TransferPluginSendData,
            type: ARRAY_TRANSFER_TYPE,
        };
        if (typeof this.runnerInstance[action.method] !== 'function') {
            await this.transferPluginsResolver.cancelReceiveData(receiveDataConfig);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            this.runnerInstance[action.method]();
            throw new WorkerRunnerUnexpectedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR(this.getErrorMessageConfig())
            });
        }

        const receivedData = await this.transferPluginsResolver.receiveData(receiveDataConfig);

        let methodResult: IRunnerMethodResult | PromiseInterrupter;
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const notAwaitedResult: IRunnerMethodResult | Promise<IRunnerMethodResult>
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                = this.runnerInstance[action.method](...receivedData.data as unknown as unknown[]);
            methodResult = notAwaitedResult instanceof Promise
                ? (await Promise.race([
                    notAwaitedResult,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this.connectDataMap.get(actionController)!.interrupter.promise,
                ]))
                : notAwaitedResult;
        } catch (error) {
            throw normalizeError(error, RunnerExecuteError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR({
                    ...this.getErrorMessageConfig(),
                    methodName: action.method,
                }),
            });
        }

        if (methodResult instanceof PromiseInterrupter) {
            return;
        }
        await this.handleExecuteResponse(actionController, action, methodResult);
    }

    /** The destruction process can be triggered by parallel calls */
    public handleDestroy(): Promise<void>;
    public handleDestroy(actionController: ActionController, actionId: WorkerRunnerIdentifier): Promise<void>;
    public async handleDestroy(actionController?: ActionController, actionId?: WorkerRunnerIdentifier): Promise<void> {
        const hasDestroyProcess = !!this.destroyProcess;
        if (!hasDestroyProcess) {
            this.destroyProcess = {
                actionTriggers: [],
            };
        }
        if (actionController) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.destroyProcess!.actionTriggers.push({actionController, actionId: actionId!});
        }
        if (!hasDestroyProcess) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.destroyProcess!.promise$ = this.runDestroyProcess()
                .finally(() => this.destroyProcess = undefined);
        }
        if (actionController) {
            // If an ActionController is specified, then the error will be sent to the RunnerEnvironmentClient
            // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-non-null-assertion
            return this.destroyProcess!.promise$!.catch(() => {});
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.destroyProcess!.promise$
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

    protected async handleDisconnect(actionController: ActionController, actionId: WorkerRunnerIdentifier): Promise<void> {
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
                const serializedError = this.errorSerialization.serializeError(
                    normalizeError(
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
        const transferDataConfig: ITransferPluginControllerTransferDataConfig = {
            actionController,
            data: methodResult as TransferPluginDataType,
        };
        if (!actionController.connectionChannel.isConnected) {
            await this.transferPluginsResolver.cancelTransferData(transferDataConfig);
            throw this.disconnectErrorFactory(new ConnectionClosedError);
        }
        const preparedData = await this.transferPluginsResolver.transferData(transferDataConfig);
        if (!actionController.connectionChannel.isConnected) {
            await preparedData.cancel?.();
            throw this.disconnectErrorFactory(new ConnectionClosedError);
        }
        actionController.sendActionResponse<IRunnerEnvironmentHostExecutedAction>({
            type: RunnerEnvironmentHostAction.EXECUTED,
            id: action.id,
            responseType: preparedData.type,
            response: preparedData.data,
        }, preparedData.transfer);
    }

    private sendActionsToDestroyTriggers (
        action: IRunnerEnvironmentHostErrorAction | IRunnerEnvironmentHostDestroyedAction
    ): void {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const actionTriggerData of this.destroyProcess!.actionTriggers) {
            actionTriggerData.actionController.sendActionResponse({
                ...action,
                id: actionTriggerData.actionId,
            });
        }
    }
    
    private async destroyInstanceAndCollectionAndSendAction() {
        try {
            await parallelPromises({
                values: [
                    () => this.destroyInstance(),
                    () => this.disconnectCollection(),
                ],
                stopAtFirstError: false,
                mapper: callback => callback(),
                errorFactory: originalErrors => new RunnerDestroyError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(
                        this.getErrorMessageConfig()
                    ),
                    originalErrors,
                }),
            });
        } catch (error) {
            this.sendActionsToDestroyTriggers({
                type: RunnerEnvironmentHostAction.ERROR,
                error: this.errorSerialization.serializeError(error),
            });
            throw error;
        }
        this.sendActionsToDestroyTriggers({
            type: RunnerEnvironmentHostAction.DESTROYED,
        });
    }

    private disconnectCollection() {
        return this.environmentClientCollection.disconnect(originalErrors => new RunnerDestroyError({
            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(
                this.getErrorMessageConfig()
            ),
            originalErrors,
        }));
    }

    private async destroyInstance() {
        try {
            if (this.runnerInstance.destroy) {
                await (this.runnerInstance.destroy as () => void | Promise<void>)();
            }
        } catch (error) {
            throw normalizeError(error, RunnerDestroyError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(
                    this.getErrorMessageConfig()
                ),
            });
        }
    }

    private async runDestroyProcess(): Promise<void> {
        try {
            await rowPromisesErrors([
                () => this.destroyInstanceAndCollectionAndSendAction(),
                () => {
                    for (const [iteratedActionController, connectData] of this.connectDataMap) {
                        // TODO Move into the Connection Strategy a check for the need to send an Initiated action
                        // and waiting for any event to resubmit the Disconnect action
                        if (!connectData.isInitiated) {
                            iteratedActionController.removeActionHandler(connectData.handler);
                            RunnerEnvironmentHost.waitAndResponseDestroyedAction(iteratedActionController);
                        } else {
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            const isActionWasSendedForActionController = this.destroyProcess!.actionTriggers
                                .some(actionTriggerData => actionTriggerData.actionController === iteratedActionController);
                            if (!isActionWasSendedForActionController) {
                                iteratedActionController.sendAction<IRunnerEnvironmentHostDestroyedAction>({
                                    type: RunnerEnvironmentHostAction.DESTROYED,
                                });
                            }
                            iteratedActionController.destroy();
                        }
                        this.connectDataMap.delete(iteratedActionController);
                    }
                }
            ], {
                errorFactory: (originalErrors) => new RunnerDestroyError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(
                        this.getErrorMessageConfig()
                    ),
                    originalErrors,
                })
            });
        } finally {
            this.onDestroyed();
        }
    }

    private initActionController(connectionChannel: BaseConnectionChannel): ActionController {
        const actionController =  new ActionController({
            connectionChannel,
            disconnectErrorFactory: this.disconnectErrorFactory,
        });
        actionController.run();
        return actionController;
    }

    private handleInitiatedAction(actionController: ActionController) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.connectDataMap.get(actionController)!.isInitiated = true;
    }

    private handleTransferAction(actionController: ActionController) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.connectDataMap.get(actionController)!.interrupter.interrupt();
    }

    private handleCloneAction(actionController: ActionController, actionId: WorkerRunnerIdentifier): void {
        const clonedAction: IRunnerEnvironmentHostClonedAction & IActionWithId = {
            type: RunnerEnvironmentHostAction.CLONED,
            id: actionId,
        };
        const preparedData = this.connectionStrategy.prepareRunnerForSend(actionController.connectionChannel);
        Object.assign(clonedAction, preparedData.data);
        const clonedActionController = this.initActionController(preparedData.connectionChannel);
        this.startHandleActionController(clonedActionController);
        actionController.sendActionResponse(clonedAction, preparedData.transfer);
    }

    private readonly disconnectErrorFactory: DisconnectErrorFactory = (
        error: ConnectionClosedError,
    ): ConnectionClosedError => 
        new ConnectionClosedError({
            captureOpt: this.disconnectErrorFactory,
            ...error,
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED(this.getErrorMessageConfig())
        });

    private startHandleActionController(actionController: ActionController): void {
        const handler = this.handleAction.bind(this, actionController);
        this.connectDataMap.set(actionController, {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            handler,
            interrupter: new PromiseInterrupter(),
        });
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        actionController.addActionHandler(handler);
    }

    private handleOwnMetadataAction(actionController: ActionController, actionId: WorkerRunnerIdentifier): void {
        let methodsNames: string[];
        try {
            methodsNames = this.runnerIdentifierConfigCollection.getRunnerMethodsNames(this.token)
        } catch (error) { // TODO NEED TEST
            throw normalizeError(error, RunnerNotFound, {
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
