import { serializeArguments } from '../../arguments-serialization/serialize-arguments';
import { ConnectClient, IConnectClientConfig } from '../../connect/client/connect.client';
import { IRunnerMessageConfig, WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { WorkerRunnerErrorSerializer } from '../../errors/error.serializer';
import { ConnectionWasClosedError, RunnerExecuteError } from '../../errors/runner-errors';
import { ResolvedRunner } from '../../runner/resolved-runner';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { IRunnerControllerConstructor } from '../../runner/runner.controller';
import { IRunnerParameter, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { RunnerToken, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { IRunnerEnvironmentHostOwnDataAction, IRunnerEnvironmentHostExecutedWithRunnerResultAction, IRunnerEnvironmentHostExecuteResultAction, IRunnerEnvironmentHostResolvedAction, RunnerEnvironmentHostAction } from '../host/runner-environment.host.actions';
import { IRunnerEnvironmentClientExecuteAction, IRunnerEnvironmentClientRequestRunnerOwnDataAction, RunnerEnvironmentClientAction } from './runner-environment.client.actions';

interface IRunnerEnvironmentClientInitSyncConfig {
    runnerControllerConstructor: IRunnerControllerConstructor,
}

interface IRunnerEnvironmentClientPartFactoryConfig {
    token: RunnerToken,
    port: MessagePort,
}

export type RunnerEnvironmentClientPartFactory<R extends RunnerConstructor>
    = (config: IRunnerEnvironmentClientPartFactoryConfig) => Promise<RunnerEnvironmentClient<R>>;

export interface IRunnerEnvironmentClientConfig<R extends RunnerConstructor> extends IRunnerEnvironmentClientPartFactoryConfig {
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    runnerEnvironmentClientPartFactory: RunnerEnvironmentClientPartFactory<R>;
    errorSerializer: WorkerRunnerErrorSerializer,
    onDestroyed: () => void;
}

export class RunnerEnvironmentClient<R extends RunnerConstructor> {
    public readonly token: RunnerToken;

    protected readonly errorSerializer: WorkerRunnerErrorSerializer;
    protected readonly connectClient: ConnectClient;
    protected readonly runnerEnvironmentClientPartFactory: RunnerEnvironmentClientPartFactory<R>;
    protected readonly onDestroyed: () => void;

    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;

    private _resolvedRunner?: ResolvedRunner<InstanceType<R>> | undefined;
    private _isMarkedForTransfer = false;

    constructor(config: Readonly<IRunnerEnvironmentClientConfig<R>>) {
        this.token = config.token;
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.onDestroyed = config.onDestroyed;
        this.runnerEnvironmentClientPartFactory = config.runnerEnvironmentClientPartFactory;
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

    // TODO Fix rule
    // eslint-disable-next-line @typescript-eslint/member-ordering
    public get isMarkedForTransfer(): boolean {
        return this._isMarkedForTransfer;
    }
    private set isMarkedForTransfer(value: boolean) {
        this._isMarkedForTransfer = value;
    }

    public initSync(config: IRunnerEnvironmentClientInitSyncConfig): void {
        this.resolvedRunner = new config.runnerControllerConstructor(this) as ResolvedRunner<InstanceType<R>>;
    }

    public async initAsync(): Promise<void> { 
        if (this.runnerIdentifierConfigCollection.hasControllerConstructor(this.token)) {
            this.initSync({
                runnerControllerConstructor: this.runnerIdentifierConfigCollection.getRunnerControllerConstructor(this.token)
            });
        } else {
            const responseAction = await this.requestRunnerOwnData();
            const runnerControllerConstructor = this.runnerIdentifierConfigCollection
                .defineRunnerController(this.token, responseAction.methodsNames);
            this.initSync({ runnerControllerConstructor });
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
        const action: IRunnerEnvironmentClientExecuteAction = {
            type: RunnerEnvironmentClientAction.EXECUTE,
            args: serializedArgumentsData.arguments,
            method: methodName,
            transfer: serializedArgumentsData.transfer,
        };
        const actionResult: IRunnerEnvironmentHostExecuteResultAction
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
        return await this.runnerEnvironmentClientPartFactory({
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
        action: IRunnerEnvironmentHostExecuteResultAction
    ): Promise<IRunnerSerializedMethodResult> {
        switch (action.type) {
            case RunnerEnvironmentHostAction.EXECUTED_WITH_RUNNER_RESULT:
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
        const actionResult: IRunnerEnvironmentHostResolvedAction = await this.connectClient.sendAction({
            type: RunnerEnvironmentClientAction.RESOLVE,
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
        action: IRunnerEnvironmentHostExecutedWithRunnerResultAction,
    ): Promise<ResolvedRunner<InstanceType<R>>> {
        const runnerEnvironmentClient = await this.runnerEnvironmentClientPartFactory({
            token: action.token,
            port: action.port,
        });
        return runnerEnvironmentClient.resolvedRunner;
    }

    private async requestRunnerOwnData(): Promise<IRunnerEnvironmentHostOwnDataAction> {
        const action: IRunnerEnvironmentClientRequestRunnerOwnDataAction = {
            type: RunnerEnvironmentClientAction.REQUEST_RUNNER_OWN_DATA,
        }
        const environmentData: IRunnerEnvironmentHostOwnDataAction
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
