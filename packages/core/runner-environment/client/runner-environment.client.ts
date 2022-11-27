import { ActionController } from '../../action-controller/action-controller';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient, DataForSendRunner } from '../../connection-strategies/base/base.connection-strategy-client';
import { IRunnerMessageConfig, WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ConnectionClosedError, RunnerDestroyError } from '../../errors/runner-errors';
import { IWorkerRunnerErrorConfig } from '../../errors/worker-runner-error';
import { PluginsResolver } from '../../plugins/resolver/plugins.resolver';
import { TransferPluginsResolver } from '../../plugins/transfer-plugin/base/transfer-plugins.resolver';
import { ICollectionTransferPluginSendArrayData } from '../../plugins/transfer-plugin/collection-transfer-plugin/collection-transfer-plugin-data';
import { ResolvedRunner } from '../../runner/resolved-runner';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { IRunnerControllerConstructor } from '../../runner/runner.controller';
import { TransferRunnerArray } from '../../transfer-data/transfer-runner-array';
import { IActionWithId } from '../../types/action';
import { IRunnerParameter, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { RunnerIdentifierConfigList, RunnerToken } from "../../types/runner-identifier";
import { WorkerRunnerIdentifier } from '../../utils/identifier-generator';
import { PromiseInterrupter } from '../../utils/promise-interrupter';
import { IRunnerEnvironmentHostAction, IRunnerEnvironmentHostClonedAction, IRunnerEnvironmentHostDestroyedAction, IRunnerEnvironmentHostDisconnectedAction, IRunnerEnvironmentHostErrorAction, IRunnerEnvironmentHostExecutedAction, IRunnerEnvironmentHostOwnMetadataAction, RunnerEnvironmentHostAction } from '../host/runner-environment.host.actions';
import { IRunnerEnvironmentClientAction, IRunnerEnvironmentClientCloneAction, IRunnerEnvironmentClientDestroyAction, IRunnerEnvironmentClientDisconnectAction, IRunnerEnvironmentClientExecuteAction, IRunnerEnvironmentClientInitiatedAction, IRunnerEnvironmentClientRequestRunnerOwnDataAction, IRunnerEnvironmentClientTransferAction, RunnerEnvironmentClientAction } from './runner-environment.client.actions';
import { RunnerEnvironmentClientCollection } from './runner-environment.client.collection';

interface IRunnerEnvironmentClientInitSyncConfig {
    runnerControllerConstructor: IRunnerControllerConstructor,
}

export interface IRunnerEnvironmentClientPartFactoryConfig {
    token: RunnerToken,
    connectionChannel: BaseConnectionChannel;
}

export type RunnerEnvironmentClientPartFactory<R extends RunnerConstructor = RunnerConstructor>
    = (config: IRunnerEnvironmentClientPartFactoryConfig) => Promise<RunnerEnvironmentClient<R>>;

export interface IRunnerEnvironmentClientConfig {
    token: RunnerToken,
    actionController: ActionController;
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    connectionStrategy: BaseConnectionStrategyClient,
    pluginsResolver: PluginsResolver;
    onDestroyed: () => void;
}

const DISCONNECT_ACTION_ID = 'DISCONNECT_ID' as unknown as WorkerRunnerIdentifier;

export class RunnerEnvironmentClient<R extends RunnerConstructor = RunnerConstructor> {
    public readonly token: RunnerToken;

    private readonly actionController: ActionController;
    private readonly connectionStrategy: BaseConnectionStrategyClient;
    private readonly onDestroyed: () => void;    
    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    private readonly pluginsResolver: PluginsResolver;
    private readonly transferPluginsResolver: TransferPluginsResolver;
    private readonly environmentCollection: RunnerEnvironmentClientCollection;

    private _resolvedRunner?: ResolvedRunner<InstanceType<R>> | undefined;
    private _isMarkedForTransfer = false;
    private destroyInterrupter = new PromiseInterrupter();

    constructor(config: Readonly<IRunnerEnvironmentClientConfig>) {
        this.token = config.token;
        this.actionController = config.actionController;
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.connectionStrategy = config.connectionStrategy;
        this.pluginsResolver = config.pluginsResolver;
        this.transferPluginsResolver = this.pluginsResolver.resolveTransferResolver();
        this.onDestroyed = config.onDestroyed;
        this.environmentCollection = new RunnerEnvironmentClientCollection({
            connectionStrategy: this.connectionStrategy,
            pluginsResolver: config.pluginsResolver,
            runnerIdentifierConfigCollection: config.runnerIdentifierConfigCollection,
        });
        this.transferPluginsResolver
            .registerRunnerEnvironmentClientPartFactory(this.environmentCollection.runnerEnvironmentClientPartFactory);

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.actionController.addActionHandler(this.handleActionWithoutId);
    }

    public get resolvedRunner(): ResolvedRunner<InstanceType<R>> {
        if (!this._resolvedRunner) {
            throw new ConnectionClosedError(this.getConnectionClosedConfig());
        }
        return this._resolvedRunner;
    }
    public set resolvedRunner(value: ResolvedRunner<InstanceType<R>>) {
        this._resolvedRunner = value;
    }

    public get isMarkedForTransfer(): boolean {
        return this._isMarkedForTransfer;
    }
    private set isMarkedForTransfer(value: boolean) {
        this._isMarkedForTransfer = value;
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
                    connectionChannel.removeActionHandler(disconnectHandler);
                    resolve();
                }
            }
            connectionChannel.addActionHandler(disconnectHandler);
            connectionChannel.run();
        });
    }

    public initSync(config: IRunnerEnvironmentClientInitSyncConfig): void {
        this.resolvedRunner = new config.runnerControllerConstructor(this) as ResolvedRunner<InstanceType<R>>;
        this.actionController.run();
        // TODO Move into the Connection Strategy a check for the need to send an Initiated action
        this.actionController.sendAction<IRunnerEnvironmentClientInitiatedAction>({
            type: RunnerEnvironmentClientAction.INITIATED,
        });
    }

    public async initAsync(): Promise<void> { 
        if (this.runnerIdentifierConfigCollection.hasControllerConstructor(this.token)) {
            this.initSync({
                runnerControllerConstructor: this.runnerIdentifierConfigCollection.getRunnerControllerConstructor(this.token)
            });
        } else {
            this.actionController.run();
            const ownMetadataAction = await this.resolveActionAndHandleError<
                IRunnerEnvironmentClientRequestRunnerOwnDataAction,
                IRunnerEnvironmentHostOwnMetadataAction
            >({
                type: RunnerEnvironmentClientAction.OWN_METADATA,
            });
            const runnerControllerConstructor = this.runnerIdentifierConfigCollection
                .defineRunnerController(this.token, ownMetadataAction.methodsNames);
            this.initSync({ runnerControllerConstructor });
        }
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
            IRunnerEnvironmentClientExecuteAction,
            IRunnerEnvironmentHostExecutedAction
        >({
            type: RunnerEnvironmentClientAction.EXECUTE,
            args: preparedData.data as unknown as ICollectionTransferPluginSendArrayData,
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
        return this.resolveAndHandleDestroyOrDisconnectAction({
            type: RunnerEnvironmentClientAction.DISCONNECT,
        });
    }

    public destroy(): Promise<void> {
        return this.resolveAndHandleDestroyOrDisconnectAction({
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
        const clonedAction = await this.resolveActionAndHandleError<IRunnerEnvironmentClientCloneAction, IRunnerEnvironmentHostClonedAction>({
            type: RunnerEnvironmentClientAction.CLONE,
        });
        return this.connectionStrategy.resolveConnectionForRunner(
            this.actionController.connectionChannel,
            clonedAction as unknown as DataForSendRunner,
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
        this.onDestroyed();
        return this.actionController.connectionChannel;
    }

    private async handleDestroy(): Promise<void> {
        this.destroyInterrupter.interrupt();
        this.actionController.destroy();
        await this.environmentCollection.disconnect((originalErrors) => new RunnerDestroyError({
            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(
                this.getErrorMessageConfig()
            ),
            originalErrors,
        }));
        this.onDestroyed();
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
            throw this.pluginsResolver.errorSerialization.deserializeError(
                (responseAction as unknown as IRunnerEnvironmentHostErrorAction).error,
            );
        }
        return responseAction;
    }

    /**
     * Prevents throwing an error if, at the time of the disconnect or destroy request,
     * the action was handled on a different "thread"
     */
    private async resolveAndHandleDestroyOrDisconnectAction(
        action: IRunnerEnvironmentClientDisconnectAction | IRunnerEnvironmentClientDestroyAction
    ): Promise<void> {
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
            return;
        }
        await this.handleDestroy();
        if (responseAction.type === RunnerEnvironmentHostAction.ERROR) {
            throw this.pluginsResolver.errorSerialization.deserializeError(
                (responseAction as unknown as IRunnerEnvironmentHostErrorAction).error,
            );
        }
    }

    
    private getErrorMessageConfig(): IRunnerMessageConfig {
        return {
            token: this.token,
            runnerName: this.runnerIdentifierConfigCollection.getRunnerConstructorSoft(this.token)?.name,
        }
    }

    private getConnectionClosedConfig(): IWorkerRunnerErrorConfig {
        return {
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED(this.getErrorMessageConfig()),
        }
    }
}
