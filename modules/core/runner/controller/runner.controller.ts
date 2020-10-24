import { IConnectControllerErrorDeserializer } from '../../connect/controller/connect-controller-error-deserializer';
import { ConnectController, IConnectControllerConfig } from '../../connect/controller/connect.controller';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { ConnectionWasClosedError } from '../../errors/runner-errors';
import { NodeRunnerResolverBase } from '../../resolver/node/node-runner.resolver';
import { IRunnerParameter, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { IRunnerEnvironmentExecuteResultAction, IRunnerEnvironmentResolvedAction, RunnerEnvironmentAction } from '../environment/runner-environment.actions';
import { ResolvedRunner } from '../resolved-runner';
import { IRunnerBridgeConstructor } from '../runner-bridge/runner.bridge';
import { RunnerToken } from '../runner-bridge/runners-list.controller';
import { IRunnerControllerExecuteAction, RunnerControllerAction } from './runner-controller.actions';

type RunnerControllerPartFactory<R extends RunnerConstructor> = (config: {
    token: RunnerToken,
    port: MessagePort,
}) => RunnerController<R>;

export interface IRunnerControllerConfig<R extends RunnerConstructor> {
    token: RunnerToken;
    originalRunnerName: string;
    port: MessagePort;
    runnerBridgeConstructor: IRunnerBridgeConstructor<R>;
    onConnectionClosed?: () => void;
    runnerControllerPartFactory: RunnerControllerPartFactory<R>;
}

export class RunnerController<R extends RunnerConstructor> {
    public readonly token: RunnerToken;
    public resolvedRunner: ResolvedRunner<InstanceType<R>>;

    public readonly originalRunnerName: string;
    // TODO use Factory
    protected readonly errorSerializer: WorkerRunnerErrorSerializer = WORKER_RUNNER_ERROR_SERIALIZER;
    protected readonly connectController: ConnectController;
    protected readonly runnerControllerPartFactory: RunnerControllerPartFactory<R>;

    private isMarkedForTransfer = false;
    private readonly onConnectionClosed?: () => void;
    private readonly runnerBridgeConstructor: IRunnerBridgeConstructor<R>;

    constructor(config: Readonly<IRunnerControllerConfig<R>>) {
        this.originalRunnerName = config.originalRunnerName;
        this.runnerBridgeConstructor = config.runnerBridgeConstructor;
        this.resolvedRunner = new this.runnerBridgeConstructor(this);
        this.token = config.token;
        this.onConnectionClosed = config.onConnectionClosed;
        this.runnerControllerPartFactory = config.runnerControllerPartFactory;
        this.connectController = this.buildConnectController({
            port: config.port,
            destroyErrorDeserializer: this.errorSerializer
                .deserialize.bind(this.errorSerializer) as IConnectControllerErrorDeserializer,
            forceDestroyHandler: this.onConnectionClosed,
            disconnectErrorFactory: this.disconnectErrorFactory.bind(this),
        });
    }

    public async execute(
        methodName: string,
        args: IRunnerParameter[],
    ): Promise<IRunnerSerializedMethodResult> {
        const serializedArgumentsData = await NodeRunnerResolverBase.serializeArguments(args);
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
            this.onConnectionClosed?.();
        }
    }

    public async destroy(): Promise<void> {
        try {
            await this.connectController.destroy();
        } finally {
            this.onConnectionClosed?.();
        }
    }

    public async cloneControl(): Promise<this> {
        return new (this.constructor as typeof RunnerController)({
            token: this.token,
            runnerBridgeConstructor: this.runnerBridgeConstructor,
            port: await this.resolveControl(),
            originalRunnerName: this.originalRunnerName,
            runnerControllerPartFactory: this.runnerControllerPartFactory,
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
        this.onConnectionClosed?.();
    }

    protected handleExecuteResult(actionResult: IRunnerEnvironmentExecuteResultAction): IRunnerSerializedMethodResult {
        switch (actionResult.type) {
            case RunnerEnvironmentAction.EXECUTE_ERROR:
                throw this.errorSerializer.deserialize(actionResult);
            case RunnerEnvironmentAction.EXECUTED_WITH_RUNNER_RESULT:
                return this.runnerControllerPartFactory({
                    token: actionResult.token,
                    port: actionResult.port,
                }).resolvedRunner;
            default:
                return actionResult.response;
        }
    }

    protected buildConnectController(
        config: IConnectControllerConfig,
    ): ConnectController {
        return new ConnectController(config);
    }

    private transferControl(): MessagePort {
        this.stopListen(false);
        return this.connectController.port;
    }

    private disconnectErrorFactory(error: ConnectionWasClosedError): ConnectionWasClosedError {
        return new ConnectionWasClosedError({
            ...error,
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                runnerName: this.originalRunnerName,
            })
        });
    }
}
