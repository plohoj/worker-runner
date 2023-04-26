import { ActionController } from '../../action-controller/action-controller';
import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { DisconnectReason } from '../../connections/base/disconnect-reason';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { normalizeError } from '../../errors/normalize-error';
import { ConnectionClosedError, IConnectionClosedErrorConfig, RunnerDestroyError, RunnerExecuteError, RunnerInitError, RunnerNotFound } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { ErrorSerializationPluginsResolver } from '../../plugins/error-serialization-plugin/base/error-serialization-plugins.resolver';
import { PluginsResolver } from '../../plugins/plugins.resolver';
import { ARRAY_TRANSFER_TYPE } from '../../plugins/transfer-plugin/array-transfer-plugin/array-transfer-plugin-data';
import { ITransferPluginReceivedData, TransferPluginDataType, TransferPluginReceivedData, TransferPluginSendData } from '../../plugins/transfer-plugin/base/transfer-plugin-data';
import { ITransferPluginsResolverReceiveDataConfig, TransferPluginsResolver } from '../../plugins/transfer-plugin/base/transfer-plugins.resolver';
import { ITransferPluginControllerTransferDataConfig } from '../../plugins/transfer-plugin/base/transfer.plugin-controller';
import { ICollectionTransferPluginSendArrayData } from '../../plugins/transfer-plugin/collection-transfer-plugin/collection-transfer-plugin-data';
import { RunnerDefinitionCollection } from '../../runner/runner-definition.collection';
import { IRunnerDescription } from '../../runner/runner-description';
import { ActionHandler, IActionWithId } from '../../types/action';
import { IRunnerMethodResult, RunnerConstructor } from '../../types/constructor';
import { IDisconnectErrorFactoryOptions } from '../../types/disconnect-error-factory';
import { RunnerToken } from "../../types/runner-identifier";
import { ErrorCollector } from '../../utils/error-collector';
import { EventHandlerController } from '../../utils/event-handler-controller';
import { WorkerRunnerIdentifier } from '../../utils/identifier-generator';
import { parallelPromises } from '../../utils/parallel-promises';
import { PromiseInterrupter } from '../../utils/promise-interrupter';
import { rowPromisesErrors } from '../../utils/row-promises-errors';
import { RunnerEnvironmentClient } from '../client/runner-environment.client';
import { IRunnerEnvironmentClientAction, IRunnerEnvironmentClientCallAction, IRunnerEnvironmentClientTransferAction, RunnerEnvironmentClientAction } from '../client/runner-environment.client.actions';
import { IRunnerEnvironmentHostClonedAction, IRunnerEnvironmentHostDestroyedAction, IRunnerEnvironmentHostDisconnectedAction, IRunnerEnvironmentHostErrorAction, IRunnerEnvironmentHostResponseAction, IRunnerEnvironmentHostOwnMetadataAction, RunnerEnvironmentHostAction } from './runner-environment.host.actions';

export interface IRunnerEnvironmentHostConfig {
    token: RunnerToken;
    connectionStrategy: BaseConnectionStrategyHost,
    runnerDefinitionCollection: RunnerDefinitionCollection;
    pluginsResolver: PluginsResolver;
}

export interface IRunnerEnvironmentHostSyncInitConfig extends IRunnerEnvironmentHostConfig {
    runnerInstance: InstanceType<RunnerConstructor>,
    connectionChannel: IBaseConnectionChannel;
}

export interface IRunnerEnvironmentHostAsyncInitConfig extends IRunnerEnvironmentHostConfig {
    arguments: ICollectionTransferPluginSendArrayData,
    connectionChannel: IBaseConnectionChannel;
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

export class RunnerEnvironmentHost {

    public readonly connectionStrategy: BaseConnectionStrategyHost;
    public readonly destroyHandlerController = new EventHandlerController<void>();
    
    private readonly runnerDescription: IRunnerDescription;
    private readonly connectDataMap = new Map<ActionController, IRunnerEnvironmentHostActionControllerConnectData>();
    private readonly runnerDefinitionCollection: RunnerDefinitionCollection;
    private readonly errorSerialization: ErrorSerializationPluginsResolver;
    private readonly transferPluginsResolver: TransferPluginsResolver;

    private _runnerInstance?: InstanceType<RunnerConstructor>;
    private destroyProcess?: IRunnerEnvironmentHostDestroyProcessData;

    private constructor(config: IRunnerEnvironmentHostConfig) {
        this.runnerDescription = {
            token: config.token,
            runnerName: config.runnerDefinitionCollection.getRunnerConstructorSoft(config.token)?.name,
        };
        this.runnerDefinitionCollection = config.runnerDefinitionCollection;
        this.connectionStrategy = config.connectionStrategy;
        const pluginsResolver = config.pluginsResolver;
        this.errorSerialization = pluginsResolver.errorSerialization;
        this.transferPluginsResolver = pluginsResolver.resolveTransferResolver({
            runnerEnvironmentClientFactory: RunnerEnvironmentClient.buildFactory({
                connectionStrategy: this.connectionStrategy.strategyClient,
                pluginsResolver: config.pluginsResolver,
                runnerDefinitionCollection: this.runnerDefinitionCollection,
            }),
            runnerDescription: this.runnerDescription,
        });
    }

    public get runnerInstance(): InstanceType<RunnerConstructor> {
        if (!this._runnerInstance) {
            throw new ConnectionClosedError(this.getConnectionClosedConfig({
                disconnectReason: DisconnectReason.ConnectionNotYetEstablished
            }));
        }
        return this._runnerInstance;
    }
    public set runnerInstance(value: InstanceType<RunnerConstructor>) {
        this._runnerInstance = value;
    }

    /**
     * Waiting for any event to resubmit the Disconnect action
     * 
     * It assumes that the {@link ActionController} has already been initialized
     * by calling the {@link ActionController.run} method.
     */
    public static waitAndResponseDestroyedAction(actionController: ActionController) {
        const disconnectReason = DisconnectReason.RunnerDestroyed;
        function destroyActionByTimeout(): void {
            actionController.destroy({ disconnectReason });
            console.warn('Timeout waiting for an action from the Environment client to resubmit the Destroy action');
        }
        const timeoutKey = setTimeout(destroyActionByTimeout, WAIT_FOR_RESPONSE_DESTROYED_ACTION_TIMEOUT);
        function afterDisconnectHandler(): void {
            actionController.sendAction<IRunnerEnvironmentHostDestroyedAction>({
                type: RunnerEnvironmentHostAction.DESTROYED,
            });
            actionController.destroy({ disconnectReason });
            clearTimeout(timeoutKey);
        }
        actionController.actionHandlerController.addHandler(afterDisconnectHandler);
    }

    /**
     * Synchronous initialization of the Runner environment,
     * in the case when the Runner instance has already been created earlier
     */
    public static initSync(config: IRunnerEnvironmentHostSyncInitConfig): RunnerEnvironmentHost {
        const environmentHost = new this(config);
        environmentHost.runnerInstance = config.runnerInstance;
        const actionController = environmentHost.initActionController(config.connectionChannel);
        environmentHost.startHandleActionController(actionController);
        return environmentHost;
    }

    /**
     * Asynchronous initialization of the Runner environment.
     * Argument data can be requested asynchronously during initialization.
     * 
     * The Runner cannot be disconnected or destroyed during initialization because control cannot be transferred
     * until initialization has completed (successfully).
     * But a request to destroy the Runner can be received when the connection of the main resolver is destroyed.
     * The connection of the main resolver takes care that this destroy method
     * is called only after the initialization is finished.
     */
    public static async initAsync(config: IRunnerEnvironmentHostAsyncInitConfig): Promise<RunnerEnvironmentHost> {
        const environmentHost = new this(config);
        let runnerInstance: InstanceType<RunnerConstructor>;
        const actionController = environmentHost.initActionController(config.connectionChannel);
        const receiveDataConfig: ITransferPluginsResolverReceiveDataConfig = {
            actionController,
            data: config.arguments satisfies ICollectionTransferPluginSendArrayData as unknown as TransferPluginSendData,
            type: ARRAY_TRANSFER_TYPE,
        };
        let runnerConstructor: RunnerConstructor;

        try {
            runnerConstructor = environmentHost.runnerDefinitionCollection
                .getRunnerConstructor(environmentHost.runnerDescription.token);
        } catch (notFoundConstructorError) {
            try {
                await environmentHost.transferPluginsResolver.cancelReceiveData(receiveDataConfig);
            } catch (cancelError) {
                throw new RunnerInitError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR(environmentHost.runnerDescription),
                    originalErrors: [
                        notFoundConstructorError,
                        cancelError,
                    ],
                });
            } finally {
                actionController.destroy({ disconnectReason: DisconnectReason.ConnectionError });
            }
            throw notFoundConstructorError;
        }

        let receivedData: ITransferPluginReceivedData;
        try {
            receivedData = await environmentHost.transferPluginsResolver.receiveData(receiveDataConfig);
        } catch(error) {
            actionController.destroy({ disconnectReason: DisconnectReason.ConnectionError });
            throw error
        }

        try {
            runnerInstance = new runnerConstructor(
                ...receivedData.data satisfies TransferPluginReceivedData as unknown as unknown[]
            );
        } catch (constructError) {
            try {
                await receivedData.cancel?.();
            } catch (cancelError) {
                throw new RunnerInitError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR(environmentHost.runnerDescription),
                    originalErrors: [
                        constructError,
                        cancelError,
                    ],
                });
            } finally {
                actionController.destroy({ disconnectReason: DisconnectReason.ConnectionError });
            }
            throw constructError;
        }
        environmentHost.runnerInstance = runnerInstance;
        environmentHost.startHandleActionController(actionController);
        return environmentHost;
    }

    public async handleCallAction(
        actionController: ActionController,
        action: IRunnerEnvironmentClientCallAction & IActionWithId,
    ): Promise<void> {
        const receiveDataConfig: ITransferPluginsResolverReceiveDataConfig = {
            actionController,
            data: action.args satisfies ICollectionTransferPluginSendArrayData as unknown as TransferPluginSendData,
            type: ARRAY_TRANSFER_TYPE,
        };
        if (typeof this.runnerInstance[action.method] !== 'function') {
            await this.transferPluginsResolver.cancelReceiveData(receiveDataConfig);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            this.runnerInstance[action.method]();
            throw new WorkerRunnerUnexpectedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR(this.runnerDescription)
            });
        }

        const receivedData = await this.transferPluginsResolver.receiveData(receiveDataConfig);

        let methodResult: IRunnerMethodResult | PromiseInterrupter;
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const notAwaitedResult: IRunnerMethodResult | Promise<IRunnerMethodResult>
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                = this.runnerInstance[action.method](
                    ...receivedData.data satisfies TransferPluginReceivedData as unknown as unknown[]
                );
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
                    ...this.runnerDescription,
                    methodName: action.method,
                }),
            });
        }

        if (methodResult instanceof PromiseInterrupter) {
            return;
        }
        await this.handleCallResponse(actionController, action, methodResult);
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
            actionController.destroy({ disconnectReason: DisconnectReason.RunnerDisconnected });
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
                case RunnerEnvironmentClientAction.CALL:
                    await this.handleCallAction(actionController, action);
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
                            message: WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR(this.runnerDescription)
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

    protected async handleCallResponse(
        actionController: ActionController,
        action: IRunnerEnvironmentClientCallAction & IActionWithId,
        methodResult: IRunnerMethodResult,
    ): Promise<void> {
        const transferDataConfig: ITransferPluginControllerTransferDataConfig = {
            actionController,
            data: methodResult as TransferPluginDataType,
        };
        const { disconnectReason: disconnectReasonBeforeTransferData } = actionController.connectionChannel;
        if (disconnectReasonBeforeTransferData) {
            await this.transferPluginsResolver.cancelTransferData(transferDataConfig);
            throw new ConnectionClosedError(this.getConnectionClosedConfig({
                disconnectReason: disconnectReasonBeforeTransferData
            }));
        }
        const preparedData = await this.transferPluginsResolver.transferData(transferDataConfig);
        const { disconnectReason: disconnectReasonAfterTransferData } = actionController.connectionChannel;
        if (disconnectReasonAfterTransferData) {
            await preparedData.cancel?.();
            throw new ConnectionClosedError(this.getConnectionClosedConfig({
                disconnectReason: disconnectReasonAfterTransferData
            }));
        }
        actionController.sendActionResponse<IRunnerEnvironmentHostResponseAction>({
            type: RunnerEnvironmentHostAction.RESPONSE,
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
                    () => this.transferPluginsResolver.destroy(),
                ],
                stopAtFirstError: false,
                mapper: callback => callback(),
                errorCollector: new ErrorCollector(originalErrors => new RunnerDestroyError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(this.runnerDescription),
                    originalErrors,
                })),
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

    private async destroyInstance() {
        try {
            if (this.runnerInstance.destroy) {
                await (this.runnerInstance.destroy as () => void | Promise<void>)();
            }
        } catch (error) {
            throw normalizeError(error, RunnerDestroyError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(this.runnerDescription),
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
                        if (connectData.isInitiated) {
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            const isActionWasSendedForActionController = this.destroyProcess!.actionTriggers
                                .some(actionTriggerData => actionTriggerData.actionController === iteratedActionController);
                            if (!isActionWasSendedForActionController) {
                                iteratedActionController.sendAction<IRunnerEnvironmentHostDestroyedAction>({
                                    type: RunnerEnvironmentHostAction.DESTROYED,
                                });
                            }
                            iteratedActionController.destroy({ disconnectReason: DisconnectReason.RunnerDestroyed });
                        } else {
                            iteratedActionController.actionHandlerController.removeHandler(connectData.handler);
                            RunnerEnvironmentHost.waitAndResponseDestroyedAction(iteratedActionController);
                        }
                        this.connectDataMap.delete(iteratedActionController);
                    }
                }
            ], {
                errorCollector: new ErrorCollector((originalErrors) => new RunnerDestroyError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(this.runnerDescription),
                    originalErrors,
                })),
            });
        } finally {
            this.destroyHandlerController.dispatch();
            this.destroyHandlerController.clear();
        }
    }

    private initActionController(connectionChannel: IBaseConnectionChannel): ActionController {
        const actionController =  new ActionController({
            connectionChannel,
            disconnectErrorFactory: disconnectReason =>
                new ConnectionClosedError(this.getConnectionClosedConfig(disconnectReason)),
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

    private startHandleActionController(actionController: ActionController): void {
        const handler = this.handleAction.bind(this, actionController);
        this.connectDataMap.set(actionController, {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            handler,
            interrupter: new PromiseInterrupter(),
        });
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        actionController.actionHandlerController.addHandler(handler);
    }

    private getConnectionClosedConfig(options: IDisconnectErrorFactoryOptions): IConnectionClosedErrorConfig {
        return {
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                ...this.runnerDescription,
                ...options,
            }),
            ...options,
        };
    }

    private handleOwnMetadataAction(actionController: ActionController, actionId: WorkerRunnerIdentifier): void {
        let methodsNames: string[];
        try {
            methodsNames = this.runnerDefinitionCollection.getRunnerMethodsNames(this.runnerDescription.token)
        } catch (error) { // TODO NEED TEST
            throw normalizeError(error, RunnerNotFound, {
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND(
                    this.runnerDescription,
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
