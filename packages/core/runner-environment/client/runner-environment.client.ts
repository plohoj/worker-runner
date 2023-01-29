import { ActionController } from '../../action-controller/action-controller';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { DataForSendRunner } from "../../connection-strategies/base/prepared-for-send-data";
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ConnectionClosedError } from '../../errors/runner-errors';
import { IWorkerRunnerErrorConfig } from '../../errors/worker-runner-error';
import { ErrorSerializationPluginsResolver } from '../../plugins/error-serialization-plugin/base/error-serialization-plugins.resolver';
import { PluginsResolver } from '../../plugins/plugins.resolver';
import { TransferPluginSendData } from '../../plugins/transfer-plugin/base/transfer-plugin-data';
import { TransferPluginsResolver } from '../../plugins/transfer-plugin/base/transfer-plugins.resolver';
import { ICollectionTransferPluginSendArrayData } from '../../plugins/transfer-plugin/collection-transfer-plugin/collection-transfer-plugin-data';
import { ResolvedRunner } from '../../runner/resolved-runner';
import { RunnerDefinitionCollection } from '../../runner/runner-definition.collection';
import { IRunnerDescription } from '../../runner/runner-description';
import { IRunnerControllerConstructor } from '../../runner/runner.controller';
import { TransferRunnerArray } from '../../transfer-data/transfer-runner-array';
import { IActionWithId } from '../../types/action';
import { IRunnerParameter, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { RunnerToken } from "../../types/runner-identifier";
import { EventHandlerController } from '../../utils/event-handler-controller';
import { WorkerRunnerIdentifier } from '../../utils/identifier-generator';
import { PromiseInterrupter } from '../../utils/promise-interrupter';
import { IRunnerEnvironmentHostAction, IRunnerEnvironmentHostClonedAction, IRunnerEnvironmentHostDestroyedAction, IRunnerEnvironmentHostDisconnectedAction, IRunnerEnvironmentHostErrorAction, IRunnerEnvironmentHostResponseAction, IRunnerEnvironmentHostOwnMetadataAction, RunnerEnvironmentHostAction } from '../host/runner-environment.host.actions';
import { IRunnerEnvironmentClientAction, IRunnerEnvironmentClientCloneAction, IRunnerEnvironmentClientDestroyAction, IRunnerEnvironmentClientDisconnectAction, IRunnerEnvironmentClientCallAction, IRunnerEnvironmentClientInitiatedAction, IRunnerEnvironmentClientRequestRunnerOwnDataAction, IRunnerEnvironmentClientTransferAction, RunnerEnvironmentClientAction } from './runner-environment.client.actions';

export interface IRunnerEnvironmentClientFactoryConfig {
    token: RunnerToken,
    connectionChannel: BaseConnectionChannel;
    transferPluginsResolver?: TransferPluginsResolver;
}

export type RunnerEnvironmentClientFactory
    = (config: IRunnerEnvironmentClientFactoryConfig) => Promise<RunnerEnvironmentClient>;

export interface IRunnerEnvironmentClientFactoryBuilderConfig {
    runnerDefinitionCollection: RunnerDefinitionCollection;
    connectionStrategy: BaseConnectionStrategyClient;
    pluginsResolver: PluginsResolver;
}
export interface IRunnerEnvironmentClientConfig extends IRunnerEnvironmentClientFactoryConfig, IRunnerEnvironmentClientFactoryBuilderConfig {}

export interface IRunnerEnvironmentClientInitSyncConfig extends IRunnerEnvironmentClientConfig {
    runnerControllerConstructor: IRunnerControllerConstructor;
}

const DISCONNECT_ACTION_ID = 'DISCONNECT_ID' satisfies string as unknown as WorkerRunnerIdentifier;

export class RunnerEnvironmentClient {
    public readonly runnerDescription: IRunnerDescription;

    public readonly destroyHandlerController = new EventHandlerController<void>();

    private readonly actionController: ActionController;
    private readonly connectionStrategy: BaseConnectionStrategyClient;
    private readonly runnerDefinitionCollection: RunnerDefinitionCollection;
    private readonly errorSerialization: ErrorSerializationPluginsResolver; 
    private readonly transferPluginsResolver: TransferPluginsResolver;
    /**
     * * If the value is set, then the destruction process has already been started earlier in {@link handleDestroy}.
     * * Throws an event when the destruction process is completed
     */
    private destroyProcess$?: Promise<void>;
    /**
     * * If the value is set, then the process of dispatching a destroy action to the host side
     * has already started earlier in {@link destroyOrDisconnectByAction}.
     * * Throws an event when the destruction process is completed
     */
    private destroyAction$?: Promise<void>;

    private _resolvedRunner?: ResolvedRunner<RunnerConstructor> | undefined;
    private _isMarkedForTransfer = false;
    private destroyInterrupter = new PromiseInterrupter();

    private constructor(config: IRunnerEnvironmentClientConfig) {
        this.runnerDescription = {
            token: config.token,
            runnerName: config.runnerDefinitionCollection.getRunnerConstructorSoft(config.token)?.name
        };
        this.actionController = new ActionController({
            connectionChannel: config.connectionChannel,
            disconnectErrorFactory: () => new ConnectionClosedError(this.getConnectionClosedConfig()),
        });
        this.runnerDefinitionCollection = config.runnerDefinitionCollection;
        this.connectionStrategy = config.connectionStrategy;
        this.errorSerialization = config.pluginsResolver.errorSerialization;
        this.transferPluginsResolver = config.transferPluginsResolver || config.pluginsResolver.resolveTransferResolver({
            runnerEnvironmentClientFactory: RunnerEnvironmentClient.buildFactory({
                connectionStrategy: this.connectionStrategy,
                pluginsResolver: config.pluginsResolver,
                runnerDefinitionCollection: this.runnerDefinitionCollection,
            }),
            runnerDescription: this.runnerDescription,
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.actionController.actionHandlerController.addHandler(this.handleActionWithoutId);
    }

    public get resolvedRunner(): ResolvedRunner<RunnerConstructor> {
        if (!this._resolvedRunner) {
            throw new ConnectionClosedError(this.getConnectionClosedConfig());
        }
        return this._resolvedRunner;
    }
    private set resolvedRunner(value: ResolvedRunner<RunnerConstructor>) {
        this._resolvedRunner = value;
    }

    public get isMarkedForTransfer(): boolean {
        return this._isMarkedForTransfer;
    }
    private set isMarkedForTransfer(value: boolean) {
        this._isMarkedForTransfer = value;
    }

    /**
     * Synchronous initialization of the Runner environment,
     * in the case when the previously constructed controller constructor is known
     * (the names of the methods of the Runner instance are known)
     */
    public static initSync(config: IRunnerEnvironmentClientInitSyncConfig): RunnerEnvironmentClient {
        const environmentClient: RunnerEnvironmentClient = new this(config);
        environmentClient.resolvedRunner = new config.runnerControllerConstructor(environmentClient);
        environmentClient.actionController.run();
        // TODO Move into the Connection Strategy a check for the need to send an Initiated action
        environmentClient.actionController.sendAction<IRunnerEnvironmentClientInitiatedAction>({
            type: RunnerEnvironmentClientAction.INITIATED,
        });
        return environmentClient;
    }

    /**
     * Asynchronous initialization of the Runner environment,
     * in case no controller constructor has been built before.
     * The names of the Runner instance methods are not known and will be requested.
     * (This happens when the Runner Controller was passed as a method argument or method result)
     */
    public static async initAsync(config: IRunnerEnvironmentClientConfig): Promise<RunnerEnvironmentClient> {
        if (config.runnerDefinitionCollection.hasControllerConstructor(config.token)) {
            return this.initSync({
                ...config,
                runnerControllerConstructor: config.runnerDefinitionCollection
                    .getRunnerControllerConstructor(config.token)
            });
        } else {
            const environmentClient: RunnerEnvironmentClient = new this(config);
            environmentClient.actionController.run();
            const ownMetadataAction = await environmentClient.resolveActionAndHandleError<
                IRunnerEnvironmentClientRequestRunnerOwnDataAction,
                IRunnerEnvironmentHostOwnMetadataAction
            >({
                type: RunnerEnvironmentClientAction.OWN_METADATA,
            });
            // It is a rare case that a Runner may receive a destroy command during initialization.
            // In this case the connection will be closed
            if (!environmentClient.actionController.connectionChannel.isConnected) {
                throw new ConnectionClosedError(environmentClient.getConnectionClosedConfig())
            }
            const runnerControllerConstructor = environmentClient.runnerDefinitionCollection
                .defineRunnerController(config.token, ownMetadataAction.methodsNames);
            environmentClient.resolvedRunner = new runnerControllerConstructor(environmentClient);
            // TODO Move into the Connection Strategy a check for the need to send an Initiated action
            environmentClient.actionController.sendAction<IRunnerEnvironmentClientInitiatedAction>({
                type: RunnerEnvironmentClientAction.INITIATED,
            });
            return environmentClient;
        }
    }

    public static buildFactory(builderConfig: IRunnerEnvironmentClientFactoryBuilderConfig): RunnerEnvironmentClientFactory {
        return async (config: IRunnerEnvironmentClientFactoryConfig) => this.initAsync({
            ...builderConfig,
            ...config
        });
    }

    /**
     * Dispatches a disconnect action, and waits for a response from the Environment host
     * 
     * **WARNING**: To get the best result of receiving a message through the MessagePort,
     * running the ConnectionChannel will be called in this method
     */
    public static disconnectConnection(connectionChannel: BaseConnectionChannel): Promise<void> {
        const promise$ = RunnerEnvironmentClient.waitDisconnectedOrDestroyedAction(connectionChannel);
        const disconnectAction: IRunnerEnvironmentClientDisconnectAction & IActionWithId = {
            id: DISCONNECT_ACTION_ID,
            type: RunnerEnvironmentClientAction.DISCONNECT,
        }
        connectionChannel.sendAction(disconnectAction);
        return promise$;
    }

    /** Waiting for a disconnect or destroy action from the Runner environment host */
    public static waitDisconnectedOrDestroyedAction(connectionChannel: BaseConnectionChannel): Promise<void> {
        return new Promise(resolve => {
            function disconnectHandler(action: IRunnerEnvironmentHostAction & IActionWithId): void {
                const isDisconnectionResponse: boolean
                    = action.id === DISCONNECT_ACTION_ID // Disconnected with error
                    || action.type === RunnerEnvironmentHostAction.DISCONNECTED
                    || action.type === RunnerEnvironmentHostAction.DESTROYED;
                if (isDisconnectionResponse) {
                    connectionChannel.actionHandlerController.removeHandler(disconnectHandler);
                    resolve();
                }
            }
            connectionChannel.actionHandlerController.addHandler(disconnectHandler);
            connectionChannel.run();
        });
    }

    public async execute(
        methodName: string,
        args: IRunnerParameter[],
    ): Promise<IRunnerSerializedMethodResult> {
        if (!this.actionController.connectionChannel.isConnected) {
            throw new ConnectionClosedError(this.getConnectionClosedConfig());
        }

        const preparedData = await this.transferPluginsResolver.transferData({
            actionController: this.actionController,
            data: new TransferRunnerArray(args),
        });

        if (!this.actionController.connectionChannel.isConnected) {
            await preparedData.cancel?.();
            throw new ConnectionClosedError(this.getConnectionClosedConfig());
        }

        // If an error occurs during the execution of the method,
        // the passed control over Runners will be destroyed on the Host side
        // TODO Possibly more efficient if ConnectStrategy decides on which side to destroy Runner control
        const actionResult = await this.resolveActionAndHandleError<
            IRunnerEnvironmentClientCallAction,
            IRunnerEnvironmentHostResponseAction
        >({
            type: RunnerEnvironmentClientAction.CALL,
            args: preparedData.data satisfies TransferPluginSendData as unknown as ICollectionTransferPluginSendArrayData,
            method: methodName,
        }, preparedData.transfer);

        const receivedData = await this.transferPluginsResolver.receiveData({
            actionController: this.actionController,
            data: actionResult.response,
            type: actionResult.responseType,
        });
        return receivedData.data as IRunnerSerializedMethodResult;
    }

    public disconnect(): Promise<void> {
        return this.destroyOrDisconnectByAction({
            type: RunnerEnvironmentClientAction.DISCONNECT,
        });
    }

    public destroy(): Promise<void> {
        return this.destroyOrDisconnectByAction({
            type: RunnerEnvironmentClientAction.DESTROY,
        });
    }

    public markForTransfer(): void {
        if (!this.actionController.connectionChannel.isConnected) {
            throw new ConnectionClosedError(this.getConnectionClosedConfig());
        }
        this.isMarkedForTransfer = true;
    }

    public async cloneControl(): Promise<BaseConnectionChannel> {
        const clonedAction = await this.resolveActionAndHandleError<
            IRunnerEnvironmentClientCloneAction,
            IRunnerEnvironmentHostClonedAction
        >({
            type: RunnerEnvironmentClientAction.CLONE,
        });
        return this.connectionStrategy.resolveConnectionForRunner(
            this.actionController.connectionChannel,
            clonedAction satisfies IRunnerEnvironmentHostClonedAction as unknown as DataForSendRunner,
        );
    }

    /**
     * * Interrupt all actions.
     * * Stop listening to all actions.
     * * Removing an {@link RunnerEnvironmentClient} Instance from a Collection
     */
    public transferControl(): BaseConnectionChannel {
        this.actionController.sendAction<IRunnerEnvironmentClientTransferAction>({
            type: RunnerEnvironmentClientAction.TRANSFER,
        });
        this.actionController.destroy(true);
        this.destroyHandlerController.dispatch();
        this.destroyHandlerController.clear();
        return this.actionController.connectionChannel;
    }

    private handleDestroy(): Promise<void> {
        if (this.destroyProcess$) {
            return this.destroyProcess$;
        }
        // During the destruction of the Resolver,
        // the Host sends a command to destroy the Runner Environment Client.
        // The Runner Environment Client may take so long to destroy
        // that the Resolver Client may additionally call disconnect.
        // Storing the destroy flow to avoid throwing an error during the ActionController is destroyed
        this.destroyProcess$ = (async () => {
            this.destroyInterrupter.interrupt();
            try {
                await this.transferPluginsResolver.destroy();
            } finally {
                this.actionController.destroy();
                this.destroyHandlerController.dispatch();
                this.destroyHandlerController.clear();
            }
        })();
        return this.destroyProcess$;
    }

    private handleActionWithoutId = async (
        action: IRunnerEnvironmentHostAction | (IRunnerEnvironmentHostAction & IActionWithId)
    ): Promise<void> => {
        if ('id' in action) {
            return;
        }
        switch (action.type) {
            case RunnerEnvironmentHostAction.DISCONNECTED:
            case RunnerEnvironmentHostAction.DESTROYED:
                await this.handleDestroy();
                break;
            default:
                break;
        }
    }

    private async resolveActionAndHandleError< // TODO Move duplicated code to actionController?
        I extends IRunnerEnvironmentClientAction,
        O extends IRunnerEnvironmentHostAction = IRunnerEnvironmentHostAction,
    >(action: I, transfer?: Transferable[]): Promise<O & IActionWithId> {
        const responseAction = await this.actionController.resolveAction<I, O>(action, transfer);
        if (responseAction.type === RunnerEnvironmentHostAction.ERROR) {
            throw this.errorSerialization.deserializeError(responseAction.error);
        }
        return responseAction;
    }

    /**
     * Prevents throwing an error if, at the time of the disconnect or destroy request,
     * the action was handled on a different "thread"
     */
    private destroyOrDisconnectByAction(
        action: IRunnerEnvironmentClientDisconnectAction | IRunnerEnvironmentClientDestroyAction
    ): Promise<void> {
        if (!this.actionController.connectionChannel.isConnected) {
            throw new ConnectionClosedError(this.getConnectionClosedConfig());
        }
        if (this.destroyProcess$) {
            return this.destroyProcess$;
        }
        if (this.destroyAction$) {
            return this.destroyAction$;
        }

        this.destroyAction$ = (async () => {
            type IResponseAction = | IRunnerEnvironmentHostDisconnectedAction
                | IRunnerEnvironmentHostDestroyedAction
                | IRunnerEnvironmentHostErrorAction;
            let responseAction: (IResponseAction & IActionWithId<string>) | PromiseInterrupter;
            try {
                responseAction = await Promise.race([
                    // WARNING interrupter should be before send action
                    this.destroyInterrupter.promise,
                    this.actionController.resolveAction<typeof action, IResponseAction>(action),
                ]);
            } catch (error) {
                await this.handleDestroy();
                throw error;
            }
            if (responseAction instanceof PromiseInterrupter) {
                return this.destroyProcess$;
            }
            await this.handleDestroy();
            if (responseAction.type === RunnerEnvironmentHostAction.ERROR) {
                throw this.errorSerialization.deserializeError(responseAction.error);
            }
        })();
        return this.destroyAction$;
    }

    private getConnectionClosedConfig(): IWorkerRunnerErrorConfig {
        return {
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED(this.runnerDescription),
        }
    }
}
