import { ActionController } from '../../action-controller/action-controller';
import { ArgumentsSerializer } from '../../arguments-serialization/arguments-serializer';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ErrorSerializer } from '../../errors/error.serializer';
import { ConnectionWasClosedError, RunnerExecuteError } from '../../errors/runner-errors';
import { ResolvedRunner } from '../../runner/resolved-runner';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { IRunnerControllerConstructor } from '../../runner/runner.controller';
import { IActionWithId } from '../../types/action';
import { IRunnerParameter, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { DisconnectErrorFactory } from '../../types/disconnect-error-factory';
import { RunnerToken, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { IRunnerEnvironmentHostOwnMetadataAction, IRunnerEnvironmentHostExecutedWithRunnerResultAction, IRunnerEnvironmentHostExecuteResultAction, IRunnerEnvironmentHostClonedAction, RunnerEnvironmentHostAction, IRunnerEnvironmentHostErrorAction, IRunnerEnvironmentHostAction } from '../host/runner-environment.host.actions';
import { IRunnerEnvironmentClientAction, IRunnerEnvironmentClientCloneAction, IRunnerEnvironmentClientDestroyAction, IRunnerEnvironmentClientDisconnectAction, IRunnerEnvironmentClientExecuteAction, IRunnerEnvironmentClientInitiatedAction, IRunnerEnvironmentClientRequestRunnerOwnDataAction, IRunnerEnvironmentClientTransferAction, RunnerEnvironmentClientAction } from './runner-environment.client.actions';

interface IRunnerEnvironmentClientInitSyncConfig {
    runnerControllerConstructor: IRunnerControllerConstructor,
}

export interface IRunnerEnvironmentClientPartFactoryConfig {
    token: RunnerToken,
    connectionChannel: BaseConnectionChannel;
}

export type RunnerEnvironmentClientPartFactory<R extends RunnerConstructor>
    = (config: IRunnerEnvironmentClientPartFactoryConfig) => Promise<RunnerEnvironmentClient<R>>;

export interface IRunnerEnvironmentClientConfig<R extends RunnerConstructor> {
    token: RunnerToken,
    actionController: ActionController;
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    connectionStrategy: BaseConnectionStrategyClient,
    errorSerializer: ErrorSerializer,
    argumentSerializer: ArgumentsSerializer;
    disconnectErrorFactory: DisconnectErrorFactory;
    runnerEnvironmentClientPartFactory: RunnerEnvironmentClientPartFactory<R>;
    onDestroyed: () => void;
}

export class RunnerEnvironmentClient<R extends RunnerConstructor> {
    public readonly token: RunnerToken;

    protected readonly actionController: ActionController;
    protected readonly connectionStrategy: BaseConnectionStrategyClient;
    protected readonly errorSerializer: ErrorSerializer;
    protected readonly argumentSerializer: ArgumentsSerializer;
    protected readonly disconnectErrorFactory: DisconnectErrorFactory;
    protected readonly runnerEnvironmentClientPartFactory: RunnerEnvironmentClientPartFactory<R>;
    protected readonly onDestroyed: () => void;

    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;

    private _resolvedRunner?: ResolvedRunner<InstanceType<R>> | undefined;
    private _isMarkedForTransfer = false;

    constructor(config: Readonly<IRunnerEnvironmentClientConfig<R>>) {
        this.token = config.token;
        this.actionController = config.actionController;
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.connectionStrategy = config.connectionStrategy;
        this.errorSerializer = config.errorSerializer;
        this.argumentSerializer = config.argumentSerializer;
        this.disconnectErrorFactory = config.disconnectErrorFactory;
        this.onDestroyed = config.onDestroyed;
        this.runnerEnvironmentClientPartFactory = config.runnerEnvironmentClientPartFactory;

        this.actionController.addActionHandler(this.handleActionWithoutId);
    }

    public get resolvedRunner(): ResolvedRunner<InstanceType<R>> {
        if (!this._resolvedRunner) {
            throw this.disconnectErrorFactory(new ConnectionWasClosedError());
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
        return new Promise(resolve => {
            function disconnectHandler(action: IRunnerEnvironmentHostAction & IActionWithId): void {
                const isDisconnectionResponse: boolean
                    = action.id === -1
                    || action.type === RunnerEnvironmentHostAction.DISCONNECTED
                    || action.type === RunnerEnvironmentHostAction.DESTROYED;
                if (isDisconnectionResponse) {
                    connectionChannel.removeActionHandler(disconnectHandler);
                    resolve();
                }
            }
            connectionChannel.addActionHandler(disconnectHandler);
            connectionChannel.run();
            const disconnectAction: IRunnerEnvironmentClientDisconnectAction & IActionWithId = {
                id: -1,
                type: RunnerEnvironmentClientAction.DISCONNECT,
            }
            connectionChannel.sendAction(disconnectAction);
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
        const serializedArgumentsData = await this.argumentSerializer.serializeArguments({
            arguments: args,
            combinedErrorsFactory: (errors: unknown[]) => new RunnerExecuteError({
                message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR({
                    token: this.token,
                    runnerName: this.runnerIdentifierConfigCollection.getRunnerConstructorSoft(this.token)?.name,
                }),
                originalErrors: errors,
            }),
        });
        // If an error occurs during the execution of the method,
        // the passed control over Runners will be destroyed on the Host side
        // TODO Possibly more efficient if ConnectStrategy decides on which side to destroy Runner control
        const actionResult = await this.resolveActionAndHandleError<
            IRunnerEnvironmentClientExecuteAction,
            IRunnerEnvironmentHostExecuteResultAction
        >({
            type: RunnerEnvironmentClientAction.EXECUTE,
            args: serializedArgumentsData.arguments,
            method: methodName,
            transfer: serializedArgumentsData.transfer,
        });
        return this.handleExecuteResult(actionResult);
    }

    public async disconnect(): Promise<void> {
        try {
            await this.resolveActionAndHandleError<IRunnerEnvironmentClientDisconnectAction>({
                type: RunnerEnvironmentClientAction.DISCONNECT,
            });
        } finally {
            this.handleDestroy();
        }
    }

    public async destroy(): Promise<void> {
        try {
            await this.resolveActionAndHandleError<IRunnerEnvironmentClientDestroyAction>({
                type: RunnerEnvironmentClientAction.DESTROY,
            });
        } finally {
            this.handleDestroy();
        }
    }

    public markForTransfer(): void {
        if (!this.actionController.connectionChannel.isConnected) {
            throw this.disconnectErrorFactory(new ConnectionWasClosedError());
        }
        this.isMarkedForTransfer = true;
    }

    public async cloneControl(): Promise<IRunnerEnvironmentHostClonedAction> {
        return this.resolveActionAndHandleError<IRunnerEnvironmentClientCloneAction, IRunnerEnvironmentHostClonedAction>({
            type: RunnerEnvironmentClientAction.CLONE,
        });
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

    protected async handleExecuteResult(
        action: IRunnerEnvironmentHostExecuteResultAction
    ): Promise<IRunnerSerializedMethodResult> {
        switch (action.type) {
            case RunnerEnvironmentHostAction.EXECUTED_WITH_RUNNER_RESULT:
                return this.handleExecuteWithRunnerResult(action);
            default:
                return action.response;
        }
    }

    private handleDestroy(): void {
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

    private async resolveActionAndHandleError<
        I extends IRunnerEnvironmentClientAction,
        O extends IRunnerEnvironmentHostAction = IRunnerEnvironmentHostAction,
    >(action: I): Promise<O & IActionWithId> {
        const responseAction = await this.actionController.resolveAction<I, O>(action);
        if (responseAction.type === RunnerEnvironmentHostAction.ERROR) {
            throw this.errorSerializer.deserialize(
                (responseAction as unknown as IRunnerEnvironmentHostErrorAction).error,
            );
        }
        return responseAction;
    }

    private async handleExecuteWithRunnerResult(
        action: IRunnerEnvironmentHostExecutedWithRunnerResultAction,
    ): Promise<ResolvedRunner<InstanceType<R>>> {
        const runnerEnvironmentClient = await this.runnerEnvironmentClientPartFactory({
            token: action.token,
            connectionChannel: this.connectionStrategy.resolveConnectionForRunner(
                this.actionController.connectionChannel,
                action,
            ),
        });
        return runnerEnvironmentClient.resolvedRunner;
    }
}
