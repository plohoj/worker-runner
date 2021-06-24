import { IConnectControllerErrorDeserializer } from '../../connect/controller/connect-controller-error-deserializer';
import { ConnectController, IConnectControllerConfig } from '../../connect/controller/connect.controller';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { ConnectionWasClosedError } from '../../errors/runner-errors';
import { serializeArguments } from '../../resolver/client/arguments-serialize';
import { IRunnerParameter, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { RunnerToken } from "../../types/runner-token";
import { IRunnerEnvironmentExecuteResultAction, IRunnerEnvironmentResolvedAction, RunnerEnvironmentAction } from '../environment/runner-environment.actions';
import { ResolvedRunner } from '../resolved-runner';
import { IRunnerBridgeConstructor } from '../runner-bridge/runner.bridge';
import { IRunnerControllerExecuteAction, RunnerControllerAction } from './runner-controller.actions';

export type RunnerControllerPartFactory<R extends RunnerConstructor> = (config: {
    token: RunnerToken,
    port: MessagePort,
    onDestroyed: (runnerController: RunnerController<R>) => void;
}) => Promise<RunnerController<R>> | RunnerController<R>;

export interface IRunnerControllerConfig<R extends RunnerConstructor> {
    token: RunnerToken;
    originalRunnerName?: string;
    port: MessagePort;
    runnerBridgeConstructor: IRunnerBridgeConstructor<R>;
    onDestroyed: (runnerController: RunnerController<R>) => void;
    runnerControllerPartFactory: RunnerControllerPartFactory<R>;
}

export class RunnerController<R extends RunnerConstructor> {
    public readonly token: RunnerToken;
    public resolvedRunner: ResolvedRunner<InstanceType<R>>;

    public readonly originalRunnerName?: string;

    protected readonly errorSerializer: WorkerRunnerErrorSerializer = WORKER_RUNNER_ERROR_SERIALIZER;
    protected readonly connectController: ConnectController;
    protected readonly runnerControllerPartFactory: RunnerControllerPartFactory<R>;

    protected onDestroyed: (runnerController: RunnerController<R>) => void;

    private isMarkedForTransfer = false;
    private readonly runnerBridgeConstructor: IRunnerBridgeConstructor<R>;

    constructor(config: Readonly<IRunnerControllerConfig<R>>) {
        this.originalRunnerName = config.originalRunnerName;
        this.runnerBridgeConstructor = config.runnerBridgeConstructor;
        this.resolvedRunner = new this.runnerBridgeConstructor(this);
        this.token = config.token;
        this.onDestroyed = config.onDestroyed;
        this.runnerControllerPartFactory = config.runnerControllerPartFactory;
        this.connectController = this.buildConnectController({
            port: config.port,
            destroyErrorDeserializer: this.errorSerializer
                .deserialize.bind(this.errorSerializer) as IConnectControllerErrorDeserializer,
            forceDestroyHandler: () => this.onDestroyed(this),
            disconnectErrorFactory: this.disconnectErrorFactory.bind(this),
        });
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

    public async cloneControl(): Promise<this> { // TODO Need add to controls list
        return new (this.constructor as typeof RunnerController)({
            token: this.token,
            runnerBridgeConstructor: this.runnerBridgeConstructor,
            port: await this.resolveControl(),
            originalRunnerName: this.originalRunnerName,
            runnerControllerPartFactory: this.runnerControllerPartFactory,
            onDestroyed: this.onDestroyed
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
        actionResult: IRunnerEnvironmentExecuteResultAction
    ): Promise<IRunnerSerializedMethodResult> {
        switch (actionResult.type) {
            case RunnerEnvironmentAction.EXECUTE_ERROR:
                throw this.errorSerializer.deserialize(actionResult);
            // TODO Result can soft token and bridgeConstructor not available (not received yet)
            case RunnerEnvironmentAction.EXECUTED_WITH_RUNNER_RESULT:
                return (await this.runnerControllerPartFactory({
                    token: actionResult.token,
                    port: actionResult.port,
                    onDestroyed: this.onDestroyed,
                })).resolvedRunner;
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
            captureOpt: this.disconnectErrorFactory,
            ...error,
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                token: this.token,
                runnerName: this.originalRunnerName,
            })
        });
    }
}
