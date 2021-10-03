import { serializeArguments } from '../../arguments-serialization/serialize-arguments';
import { ConnectClient, IConnectClientConfig } from '../../connect/client/connect.client';
import { IRunnerMessageConfig, WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { WorkerRunnerErrorSerializer } from '../../errors/error.serializer';
import { ConnectionWasClosedError, RunnerExecuteError } from '../../errors/runner-errors';
import { IRunnerParameter, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { RunnerToken, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { IRunnerEnvironmentOwnDataAction, IRunnerEnvironmentExecutedWithRunnerResultAction, IRunnerEnvironmentExecuteResultAction, IRunnerEnvironmentResolvedAction, RunnerEnvironmentAction } from '../environment/runner-environment.actions';
import { ResolvedRunner } from '../resolved-runner';
import { RunnerIdentifierConfigCollection } from '../runner-identifier-config.collection';
import { IRunnerBridgeConstructor } from '../runner.bridge';
import { IRunnerControllerExecuteAction, IRunnerControllerRequestRunnerOwnDataAction, RunnerControllerAction } from './runner-controller.actions';

interface IRunnerControllerInitSyncConfig {
    runnerBridgeConstructor: IRunnerBridgeConstructor,
}

interface IRunnerControllerPartFactoryConfig {
    token: RunnerToken,
    port: MessagePort,
}

export type RunnerControllerPartFactory<R extends RunnerConstructor>
    = (config: IRunnerControllerPartFactoryConfig) => Promise<RunnerController<R>>;

export interface IRunnerControllerConfig<R extends RunnerConstructor> extends IRunnerControllerPartFactoryConfig {
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    runnerControllerPartFactory: RunnerControllerPartFactory<R>;
    errorSerializer: WorkerRunnerErrorSerializer,
    onDestroyed: () => void;
}

export class RunnerController<R extends RunnerConstructor> {
    public readonly token: RunnerToken;

    protected readonly errorSerializer: WorkerRunnerErrorSerializer;
    protected readonly connectClient: ConnectClient;
    protected readonly runnerControllerPartFactory: RunnerControllerPartFactory<R>;
    protected readonly onDestroyed: () => void;

    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;

    private _resolvedRunner?: ResolvedRunner<InstanceType<R>> | undefined;
    private _isMarkedForTransfer = false;

    constructor(config: Readonly<IRunnerControllerConfig<R>>) {
        this.token = config.token;
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.onDestroyed = config.onDestroyed;
        this.runnerControllerPartFactory = config.runnerControllerPartFactory;
        this.errorSerializer = config.errorSerializer;
        this.connectClient = this.buildConnectClientByPartConfig({ port: config.port });
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

    public initSync(config: IRunnerControllerInitSyncConfig): void {
        this.resolvedRunner = new config.runnerBridgeConstructor(this) as ResolvedRunner<InstanceType<R>>;
    }

    public async initAsync(): Promise<void> { 
        if (this.runnerIdentifierConfigCollection.hasBridgeConstructor(this.token)) {
            this.initSync({
                runnerBridgeConstructor: this.runnerIdentifierConfigCollection.getRunnerBridgeConstructor(this.token)
            });
        } else {
            const responseAction = await this.requestRunnerOwnData();
            const runnerBridgeConstructor = this.runnerIdentifierConfigCollection
                .defineRunnerBridge(this.token, responseAction.methodsNames);
            this.initSync({ runnerBridgeConstructor });
        }
    }

    public async execute(
        methodName: string,
        args: IRunnerParameter[],
    ): Promise<IRunnerSerializedMethodResult> {
        const serializedArgumentsData = await serializeArguments({
            arguments: args,
            combinedErrorsFactory: (errors: unknown[]) => new RunnerExecuteError({
                message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR(
                    this.getErrorMessageConfig(),
                ),
                originalErrors: errors,
            }),
        });
        const action: IRunnerControllerExecuteAction = {
            type: RunnerControllerAction.EXECUTE,
            args: serializedArgumentsData.arguments,
            method: methodName,
            transfer: serializedArgumentsData.transfer,
        };
        const actionResult: IRunnerEnvironmentExecuteResultAction
            = await this.connectClient.sendAction(action);
        return this.handleExecuteResult(actionResult);
    }

    public async disconnect(): Promise<void> {
        try {
            await this.connectClient.disconnect();
        } finally {
            this.onDestroyed();
        }
    }

    public async destroy(): Promise<void> {
        try {
            await this.connectClient.destroy();
        } finally {
            this.onDestroyed();
        }
    }

    public async cloneControl(): Promise<this> {
        return await this.runnerControllerPartFactory({
            token: this.token,
            port: await this.resolveControl(),
        }) as this;
    }

    public markForTransfer(): void {
        if (this.connectClient.disconnectStatus) {
            throw this.connectClient.disconnectStatus;
        }
        this.isMarkedForTransfer = true;
    }

    public async resolveOrTransferControl(): Promise<MessagePort> {
        if (this.isMarkedForTransfer) {
            return this.transferControl();
        }
        return this.resolveControl();
    }

    public stopListen(isClosePort = true): void {
        if (this.connectClient.disconnectStatus) {
            throw this.connectClient.disconnectStatus;
        }
        this.connectClient.stopListen(isClosePort);
        this.onDestroyed();
    }

    protected async handleExecuteResult(
        action: IRunnerEnvironmentExecuteResultAction
    ): Promise<IRunnerSerializedMethodResult> {
        switch (action.type) {
            case RunnerEnvironmentAction.EXECUTED_WITH_RUNNER_RESULT:
                return this.handleExecuteWithRunnerResult(action);
            default:
                return action.response;
        }
    }

    protected buildConnectClient(
        config: IConnectClientConfig,
    ): ConnectClient {
        return new ConnectClient(config);
    }

    protected getErrorMessageConfig(): IRunnerMessageConfig {
        return {
            token: this.token,
            runnerName: this.runnerIdentifierConfigCollection.getRunnerConstructorSoft(this.token)?.name,
        }
    }

    private async resolveControl(): Promise<MessagePort> {
        const actionResult: IRunnerEnvironmentResolvedAction = await this.connectClient.sendAction({
            type: RunnerControllerAction.RESOLVE,
        });
        return actionResult.port;
    }

    private buildConnectClientByPartConfig(
        config: Pick<IConnectClientConfig, 'port'>,
    ): ConnectClient {
        return this.buildConnectClient({
            errorSerializer: this.errorSerializer,
            forceDestroyHandler: () => this.onDestroyed(),
            disconnectErrorFactory: this.disconnectErrorFactory.bind(this),
            ...config,
        });
    }

    private async handleExecuteWithRunnerResult(
        action: IRunnerEnvironmentExecutedWithRunnerResultAction,
    ): Promise<ResolvedRunner<InstanceType<R>>> {
        const runnerController = await this.runnerControllerPartFactory({
            token: action.token,
            port: action.port,
        });
        return runnerController.resolvedRunner;
    }

    private async requestRunnerOwnData(): Promise<IRunnerEnvironmentOwnDataAction> {
        const action: IRunnerControllerRequestRunnerOwnDataAction = {
            type: RunnerControllerAction.REQUEST_RUNNER_OWN_DATA,
        }
        const environmentData: IRunnerEnvironmentOwnDataAction
            = await this.connectClient.sendAction(action);

        return environmentData;
    }

    private transferControl(): MessagePort {
        this.stopListen(false);
        return this.connectClient.port;
    }

    private disconnectErrorFactory(error: ConnectionWasClosedError): ConnectionWasClosedError {
        return new ConnectionWasClosedError({
            captureOpt: this.disconnectErrorFactory,
            ...error,
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED(
                this.getErrorMessageConfig(),
            )
        });
    }
}
