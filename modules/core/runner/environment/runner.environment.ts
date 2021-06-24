import { ConnectEnvironmentErrorSerializer } from '../../connect/environment/connect-environment-error-serializer';
import { ConnectEnvironment, IConnectEnvironmentConfig } from '../../connect/environment/connect.environment';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ISerializedError, WorkerRunnerErrorSerializer } from '../../errors/error.serializer';
import { RunnerDestroyError, RunnerExecuteError } from '../../errors/runner-errors';
import { ArgumentsDeserializer } from '../../resolver/host/arguments-deserializer';
import { IRunnerMethodResult, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { TransferableJsonObject } from '../../types/json-object';
import { RunnerToken } from "../../types/runner-token";
import { TransferRunnerData } from '../../utils/transfer-runner-data';
import { IRunnerControllerAction, IRunnerControllerExecuteAction, RunnerControllerAction } from '../controller/runner-controller.actions';
import { RunnerController } from '../controller/runner.controller';
import { RunnerBridge, RUNNER_BRIDGE_CONTROLLER } from '../runner-bridge/runner.bridge';
import { IRunnerEnvironmentAction, IRunnerEnvironmentExecuteResultAction, IRunnerEnvironmentResolvedAction, RunnerEnvironmentAction } from './runner-environment.actions';

export interface IRunnerEnvironmentConfig<R extends RunnerConstructor> {
    token: RunnerToken;
    runner: InstanceType<R>;
    errorSerializer: WorkerRunnerErrorSerializer;
    argumentsDeserializer: ArgumentsDeserializer<R>,
    port: MessagePort;
    onDestroyed: () => void;
}

export class RunnerEnvironment<R extends RunnerConstructor> {

    public readonly token: RunnerToken;

    public runnerInstance: InstanceType<R>;

    protected readonly errorSerializer: WorkerRunnerErrorSerializer;
    protected readonly connectEnvironment: ConnectEnvironment;

    private onDestroyed: () => void;
    private connectedControllers = new Array<RunnerController<RunnerConstructor>>();
    private argumentsDeserializer: ArgumentsDeserializer<R>;

    constructor(config: Readonly<IRunnerEnvironmentConfig<R>>) {
        this.token = config.token;
        this.errorSerializer = config.errorSerializer
        this.runnerInstance = config.runner;
        this.onDestroyed = config.onDestroyed;
        this.argumentsDeserializer = config.argumentsDeserializer;
        this.connectEnvironment = this.buildConnectEnvironment({
            destroyErrorSerializer: this.destroyErrorSerializer.bind(this) as ConnectEnvironmentErrorSerializer,
            actionsHandler: this.handleAction.bind(this),
            destroyHandler: this.handleDestroy.bind(this),
        });
        this.connectEnvironment.addPort(config.port);
    }

    public async execute(
        action: IRunnerControllerExecuteAction,
    ): Promise<IRunnerEnvironmentExecuteResultAction> {
        let response: IRunnerMethodResult;
        const deserializedArgumentsData = this.argumentsDeserializer.deserializeArguments(action.args);
        try {
            response = await this.runnerInstance[action.method](...deserializedArgumentsData.args);
        } catch (error) {
            await Promise.all(deserializedArgumentsData.controllers
                .map(controller => controller.disconnect()));
            return {
                type: RunnerEnvironmentAction.EXECUTE_ERROR,
                ... this.errorSerializer.serialize(error, new RunnerExecuteError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR({
                        token: this.token,
                        runnerName: this.runnerName,
                        methodName: action.method,
                    }),
                })),
            };
        }
        this.addConnectedControllers(deserializedArgumentsData.controllers);
        return await this.handleExecuteResponse(response);
    }

    public addConnectedControllers(controllers: RunnerController<RunnerConstructor>[]): void {
        this.connectedControllers.push(...controllers);
    }

    public async handleDestroy(): Promise<void> {
        try {
            if (this.runnerInstance.destroy) {
                await (this.runnerInstance.destroy as () => void | Promise<void>)();
            }
        } finally {
            await Promise.all(
                this.connectedControllers
                    .map(controller => controller
                        .destroy()
                        .catch(console.error), // TODO need to combine errors
                    ),
            );
            this.connectedControllers = [];
            this.onDestroyed();
        }
    }

    public get runnerName(): string {
        return this.runnerInstance.constructor.name;
    }

    protected async handleAction(
        action: IRunnerControllerAction,
    ): Promise<IRunnerEnvironmentAction> {
        switch (action.type) {
            case RunnerControllerAction.EXECUTE:
                try {
                    return await this.execute(action);
                } catch (error) {
                    return {
                        type: RunnerEnvironmentAction.EXECUTE_ERROR,
                        ... this.errorSerializer.serialize(error, new RunnerExecuteError({
                            message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR({
                                token: this.token,
                                methodName: action.method,
                                runnerName: this.runnerName,
                            }),
                        })),
                    };
                }
            case RunnerControllerAction.RESOLVE:
                return await this.resolve();
        }
    }

    protected async handleExecuteResponse(
        executeResult: IRunnerMethodResult,
    ): Promise<IRunnerEnvironmentExecuteResultAction> {
        if (RunnerBridge.isRunnerBridge(executeResult)) {
            const runnerController = executeResult[RUNNER_BRIDGE_CONTROLLER];
            const transferPort: MessagePort = await runnerController.resolveOrTransferControl();
            return {
                type: RunnerEnvironmentAction.EXECUTED_WITH_RUNNER_RESULT,
                port: transferPort,
                token: runnerController.token,
                transfer: [transferPort],
            };
        } else {
            let response: IRunnerSerializedMethodResult;
            const transfer: Transferable[] = [];
            if (executeResult instanceof TransferRunnerData) {
                transfer.push(...executeResult.transfer);
                response = executeResult.data;
            } else {
                response = executeResult;
            }
            return {
                type: RunnerEnvironmentAction.EXECUTED,
                response: response as TransferableJsonObject,
                transfer,
            };
        }
    }

    protected buildConnectEnvironment(config: IConnectEnvironmentConfig): ConnectEnvironment {
        return new ConnectEnvironment(config);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private destroyErrorSerializer(error: any): ISerializedError {
        return this.errorSerializer.serialize(error, new RunnerDestroyError({
            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR({
                token: this.token,
                runnerName: this.runnerName,
            }),
        }));
    }

    private async resolve(): Promise<IRunnerEnvironmentResolvedAction> {
        const messageChanel = new MessageChannel();
        this.connectEnvironment.addPort(messageChanel.port1);
        return {
            type: RunnerEnvironmentAction.RESOLVED,
            port: messageChanel.port2,
            transfer: [messageChanel.port2]
        };
    }
}
