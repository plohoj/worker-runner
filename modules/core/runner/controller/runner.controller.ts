import { IConnectControllerErrorDeserializer } from '../../connect/controller/connect-controller-error-deserializer';
import { ConnectController, IConnectControllerConfig } from '../../connect/controller/connect.controller';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { WorkerRunnerErrorSerializer } from '../../errors/error.serializer';
import { ConnectionWasClosedError } from '../../errors/runner-errors';
import { serializeArguments } from '../../resolver/client/arguments-serialize';
import { IRunnerParameter, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { RunnerToken, SoftRunnersList } from "../../types/runner-identifier";
import { IRunnerEnvironmentOwnDataResponseAction, IRunnerEnvironmentExecutedWithRunnerResultAction, IRunnerEnvironmentExecuteResultAction, IRunnerEnvironmentResolvedAction, RunnerEnvironmentAction } from '../environment/runner-environment.actions';
import { ResolvedRunner } from '../resolved-runner';
import { IRunnerBridgeConstructor } from '../runner-bridge/runner.bridge';
import { RunnersListController } from '../runner-bridge/runners-list.controller';
import { IRunnerControllerExecuteAction, IRunnerControllerRequestRunnerOwnDataAction, RunnerControllerAction } from './runner-controller.actions';

interface IRunnerControllerInitConfig {
    runnerBridgeConstructor?: IRunnerBridgeConstructor,
}

interface IRunnerControllerPartFactoryConfig<R extends RunnerConstructor> {
    token: RunnerToken,
    port: MessagePort,
    onDestroyed: (runnerController: RunnerController<R>) => void;
}

export type RunnerControllerPartFactory<R extends RunnerConstructor>
    = (config: IRunnerControllerPartFactoryConfig<R>) => Promise<RunnerController<R>>;

export interface IRunnerControllerConfig<R extends RunnerConstructor> extends IRunnerControllerPartFactoryConfig<R> {
    runnersListController: RunnersListController<SoftRunnersList>;
    runnerControllerPartFactory: RunnerControllerPartFactory<R>;
    errorSerializer: WorkerRunnerErrorSerializer,
}

export class RunnerController<R extends RunnerConstructor> {
    public readonly token: RunnerToken;

    protected readonly errorSerializer: WorkerRunnerErrorSerializer;
    protected readonly connectController: ConnectController;
    protected readonly runnerControllerPartFactory: RunnerControllerPartFactory<R>;
    protected readonly onDestroyed: (runnerController: RunnerController<R>) => void;

    private readonly runnersListController: RunnersListController<SoftRunnersList>;

    private _resolvedRunner?: ResolvedRunner<InstanceType<R>> | undefined;
    private isMarkedForTransfer = false;

    constructor(config: Readonly<IRunnerControllerConfig<R>>) {
        this.token = config.token;
        this.runnersListController = config.runnersListController;
        this.onDestroyed = config.onDestroyed;
        this.runnerControllerPartFactory = config.runnerControllerPartFactory;
        this.errorSerializer = config.errorSerializer;
        this.connectController = this.buildConnectControllerByPartConfig({ port: config.port });
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

    public init(config: Required<IRunnerControllerInitConfig>): void;
    public init(): Promise<void> | void;
    public init(config?: IRunnerControllerInitConfig): Promise<void> | void { 
        if (config?.runnerBridgeConstructor) {
            const runnerBridgeConstructor = config.runnerBridgeConstructor;
            this.resolvedRunner = new runnerBridgeConstructor(this) as ResolvedRunner<InstanceType<R>>;
        } else {
            if (this.runnersListController.hasBridgeConstructor(this.token)) {
                this.init({
                    runnerBridgeConstructor: this.runnersListController.getRunnerBridgeConstructor(this.token)
                });
            } else {
                return this.requestRunnerOwnData().then(responseAction => {
                    const runnerBridgeConstructor = this.runnersListController
                        .defineRunnerBridge(this.token, responseAction.methodsNames);
                    this.resolvedRunner = new runnerBridgeConstructor(this);
                    return;
                });
            }
        }
    }

    public async execute(
        methodName: string,
        args: IRunnerParameter[],
    ): Promise<IRunnerSerializedMethodResult> {
        const serializedArgumentsData = await serializeArguments(args);
        const actionResult = await this.connectController
            .sendAction<IRunnerControllerExecuteAction, IRunnerEnvironmentExecuteResultAction>({
                type: RunnerControllerAction.EXECUTE,
                args: serializedArgumentsData.args,
                method: methodName,
                transfer: serializedArgumentsData.transfer,
            });
        return this.handleExecuteResult(actionResult);
    }

    public async disconnect(): Promise<void> {
        try {
            await this.connectController.disconnect();
        } finally {
            this.onDestroyed(this);
        }
    }

    public async destroy(): Promise<void> {
        try {
            await this.connectController.destroy();
        } finally {
            this.onDestroyed(this);
        }
    }

    public async cloneControl(): Promise<this> {
        return await this.runnerControllerPartFactory({
            token: this.token,
            port: await this.resolveControl(),
            onDestroyed: this.onDestroyed,
        }) as this;
    }

    public markForTransfer(): void {
        if (this.connectController.disconnectStatus) {
            throw this.connectController.disconnectStatus;
        }
        this.isMarkedForTransfer = true;
    }

    public async resolveControl(): Promise<MessagePort> {
        const actionResult = await this.connectController.sendAction({
            type: RunnerControllerAction.RESOLVE,
        }) as IRunnerEnvironmentResolvedAction;
        return actionResult.port;
    }

    public async resolveOrTransferControl(): Promise<MessagePort> {
        if (this.isMarkedForTransfer) {
            return this.transferControl();
        }
        return this.resolveControl();
    }

    public stopListen(isClosePort = true): void {
        if (this.connectController.disconnectStatus) {
            throw this.connectController.disconnectStatus;
        }
        this.connectController.stopListen(isClosePort);
        this.onDestroyed(this);
    }

    protected async handleExecuteResult(
        action: IRunnerEnvironmentExecuteResultAction
    ): Promise<IRunnerSerializedMethodResult> {
        switch (action.type) {
            case RunnerEnvironmentAction.EXECUTE_ERROR:
                throw this.errorSerializer.deserialize(action);
            case RunnerEnvironmentAction.EXECUTED_WITH_RUNNER_RESULT:
                return this.handleExecuteWithRunnerResult(action);
            default:
                return action.response;
        }
    }

    protected buildConnectController(
        config: IConnectControllerConfig,
    ): ConnectController {
        return new ConnectController(config);
    }

    private buildConnectControllerByPartConfig(
        config: Pick<IConnectControllerConfig, 'port'>,
    ): ConnectController {
        return this.buildConnectController({
            destroyErrorDeserializer: this.errorSerializer
                .deserialize.bind(this.errorSerializer) as IConnectControllerErrorDeserializer,
            forceDestroyHandler: () => this.onDestroyed(this),
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
            onDestroyed: this.onDestroyed,
        });
        return runnerController.resolvedRunner;
    }

    private async requestRunnerOwnData(): Promise<IRunnerEnvironmentOwnDataResponseAction> {
        const action: IRunnerControllerRequestRunnerOwnDataAction = {
            type: RunnerControllerAction.REQUEST_RUNNER_OWN_DATA,
        }
        const environmentData = await this.connectController
            .sendAction<IRunnerControllerRequestRunnerOwnDataAction, IRunnerEnvironmentOwnDataResponseAction>(action);

        return environmentData;
    }

    private transferControl(): MessagePort {
        // TODO remove this Controller from ClientResolver controllers list
        this.stopListen(false);
        return this.connectController.port;
    }

    private disconnectErrorFactory(error: ConnectionWasClosedError): ConnectionWasClosedError {
        return new ConnectionWasClosedError({
            captureOpt: this.disconnectErrorFactory,
            ...error,
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                token: this.token,
                runnerName: this.runnersListController.getRunnerConstructorSoft(this.token)?.name,
            })
        });
    }
}
