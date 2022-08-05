import { TransferPluginsResolver } from '@worker-runner/core/plugins/transfer-plugin/transfer-plugins.resolver';
import { ActionController } from '../../action-controller/action-controller';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient, DataForSendRunner } from '../../connection-strategies/base/base.connection-strategy-client';
import { ErrorSerializer } from '../../errors/error.serializer';
import { ConnectionClosedError } from '../../errors/runner-errors';
import { ICollectionTransferPluginSendArrayData } from '../../plugins/collection-transfer-plugin/collection-transfer-plugin-data';
import { PluginsResolver } from '../../plugins/plugins.resolver';
import { ResolvedRunner } from '../../runner/resolved-runner';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { IRunnerControllerConstructor } from '../../runner/runner.controller';
import { TransferRunnerArray } from '../../transfer-data/transfer-runner-array';
import { IActionWithId } from '../../types/action';
import { IRunnerParameter, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { DisconnectErrorFactory } from '../../types/disconnect-error-factory';
import { RunnerIdentifierConfigList, RunnerToken } from "../../types/runner-identifier";
import { PromiseInterrupter } from '../../utils/promise-interrupter';
import { IRunnerEnvironmentHostAction, IRunnerEnvironmentHostClonedAction, IRunnerEnvironmentHostDestroyedAction, IRunnerEnvironmentHostDisconnectedAction, IRunnerEnvironmentHostErrorAction, IRunnerEnvironmentHostExecutedAction, IRunnerEnvironmentHostOwnMetadataAction, RunnerEnvironmentHostAction } from '../host/runner-environment.host.actions';
import { IRunnerEnvironmentClientAction, IRunnerEnvironmentClientCloneAction, IRunnerEnvironmentClientDestroyAction, IRunnerEnvironmentClientDisconnectAction, IRunnerEnvironmentClientExecuteAction, IRunnerEnvironmentClientInitiatedAction, IRunnerEnvironmentClientRequestRunnerOwnDataAction, IRunnerEnvironmentClientTransferAction, RunnerEnvironmentClientAction } from './runner-environment.client.actions';

interface IRunnerEnvironmentClientInitSyncConfig {
    runnerControllerConstructor: IRunnerControllerConstructor,
}

export interface IRunnerEnvironmentClientPartFactoryConfig {
    token: RunnerToken,
    connectionChannel: BaseConnectionChannel;
}

export type RunnerEnvironmentClientPartFactory<R extends RunnerConstructor = RunnerConstructor>
    = (config: IRunnerEnvironmentClientPartFactoryConfig) => Promise<RunnerEnvironmentClient<R>>;

export interface IRunnerEnvironmentClientConfig<R extends RunnerConstructor> {
    token: RunnerToken,
    actionController: ActionController;
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    connectionStrategy: BaseConnectionStrategyClient,
    errorSerializer: ErrorSerializer,
    pluginsResolver: PluginsResolver;
    disconnectErrorFactory: DisconnectErrorFactory;
    runnerEnvironmentClientPartFactory: RunnerEnvironmentClientPartFactory<R>;
    onDestroyed: () => void;
}

export class RunnerEnvironmentClient<R extends RunnerConstructor = RunnerConstructor> {
    public readonly token: RunnerToken;

    protected readonly actionController: ActionController;
    protected readonly connectionStrategy: BaseConnectionStrategyClient;
    protected readonly errorSerializer: ErrorSerializer;
    protected readonly disconnectErrorFactory: DisconnectErrorFactory;
    protected readonly onDestroyed: () => void;
    
    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    private readonly pluginsResolver: PluginsResolver;
    private readonly transferPluginsResolver: TransferPluginsResolver;

    private _resolvedRunner?: ResolvedRunner<InstanceType<R>> | undefined;
    private _isMarkedForTransfer = false;
    private destroyInterrupter = new PromiseInterrupter();

    constructor(config: Readonly<IRunnerEnvironmentClientConfig<R>>) {
        this.token = config.token;
        this.actionController = config.actionController;
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.connectionStrategy = config.connectionStrategy;
        this.errorSerializer = config.errorSerializer;
        this.pluginsResolver = config.pluginsResolver;
        this.transferPluginsResolver = this.pluginsResolver.resolveTransferResolver();
        this.disconnectErrorFactory = config.disconnectErrorFactory;
        this.onDestroyed = config.onDestroyed;
        this.transferPluginsResolver
            .registerRunnerEnvironmentClientPartFactory(config.runnerEnvironmentClientPartFactory);

        this.actionController.addActionHandler(this.handleActionWithoutId);
    }

    public get resolvedRunner(): ResolvedRunner<InstanceType<R>> {
        if (!this._resolvedRunner) {
            throw this.disconnectErrorFactory(new ConnectionClosedError());
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
            id: -1,
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
                    = action.id === -1 // Disconnected with error
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
            throw this.disconnectErrorFactory(new ConnectionClosedError());
        }

        const preparedData = await this.transferPluginsResolver.transferData({
            actionController: this.actionController,
            data: new TransferRunnerArray(args),
        });

        if (!this.actionController.connectionChannel.isConnected) {
            await preparedData.cancel?.();
            throw this.disconnectErrorFactory(new ConnectionClosedError());
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
            throw this.disconnectErrorFactory(new ConnectionClosedError());
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

    private handleDestroy(): void {
        this.destroyInterrupter.interrupt();
        this.actionController.destroy();
        this.onDestroyed();
    }

    private handleActionWithoutId = (
        action: IRunnerEnvironmentHostAction | (IRunnerEnvironmentHostAction & IActionWithId)
    ): void => {
        if ('id' in action) {
            return;
        }
        switch (action.type) {
            case RunnerEnvironmentHostAction.DISCONNECTED:
            case RunnerEnvironmentHostAction.DESTROYED:
                this.handleDestroy();
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
            throw this.errorSerializer.deserialize(
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
                this.actionController.resolveAction<typeof action, IResponseAction>(action),
                this.destroyInterrupter.promise,
            ]);
        } catch (error) {
            this.handleDestroy();
            throw error;
        }
        if (responseAction instanceof PromiseInterrupter) {
            return;
        }
        this.handleDestroy();
        if (responseAction.type === RunnerEnvironmentHostAction.ERROR) {
            throw this.errorSerializer.deserialize(
                (responseAction as unknown as IRunnerEnvironmentHostErrorAction).error,
            );
        }
    }
}
