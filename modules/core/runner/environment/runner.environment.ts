import { ConnectEnvironmentErrorSerializer } from '../../connect/environment/connect-environment-error-serializer';
import { ConnectEnvironment, IConnectEnvironmentConfig } from '../../connect/environment/connect.environment';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ISerializedError, WorkerRunnerErrorSerializer } from '../../errors/error.serializer';
import { RunnerDestroyError, RunnerExecuteError } from '../../errors/runner-errors';
import { BaseWorkerRunnerResolver } from '../../resolver/worker/worker-runner.resolver';
import { IRunnerMethodResult, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { TransferableJsonObject } from '../../types/json-object';
import { TransferRunnerData } from '../../utils/transfer-runner-data';
import { IRunnerControllerAction, IRunnerControllerExecuteAction, RunnerControllerAction } from '../controller/runner-controller.actions';
import { RunnerController } from '../controller/runner.controller';
import { RunnerBridge, RUNNER_BRIDGE_CONTROLLER } from '../runner-bridge/runner.bridge';
import { IRunnerEnvironmentAction, IRunnerEnvironmentExecuteResultAction, IRunnerEnvironmentResolvedAction, RunnerEnvironmentAction } from './runner-environment.actions';

export interface IRunnerEnvironmentConfig<R extends RunnerConstructor> {
    runner: InstanceType<R>;
    workerRunnerResolver: BaseWorkerRunnerResolver<never>;
    errorSerializer: WorkerRunnerErrorSerializer;
    port: MessagePort;
    onDestroyed: () => void;
}

export class RunnerEnvironment<R extends RunnerConstructor> {

    public runnerInstance: InstanceType<R>;

    protected readonly errorSerializer: WorkerRunnerErrorSerializer;
    protected readonly connectEnvironment: ConnectEnvironment;

    private workerRunnerResolver: BaseWorkerRunnerResolver<never>;
    private onDestroyed: () => void;
    private connectedControllers = new Array<RunnerController<RunnerConstructor>>(); // TODO Need disconnect?

    constructor(config: Readonly<IRunnerEnvironmentConfig<R>>) {
        this.errorSerializer = config.errorSerializer
        this.runnerInstance = config.runner;
        this.workerRunnerResolver = config.workerRunnerResolver;
        this.onDestroyed = config.onDestroyed;
        this.connectEnvironment = this.connectEnvironmentFactory({
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
        const deserializeArgumentsData = this.workerRunnerResolver.deserializeArguments(action.args);
        try {
            response = await this.runnerInstance[action.method](...deserializeArgumentsData.args);
        } catch (error) {
            await Promise.all(deserializeArgumentsData.controllers
                .map(controller => controller.disconnect()));
            return {
                type: RunnerEnvironmentAction.EXECUTE_ERROR,
                ... this.errorSerializer.serialize(error, new RunnerExecuteError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR({
                        runnerName: this.runnerName,
                        methodName: action.method,
                    }),
                    stack: error?.stack
                })),
            };
        }
        this.addConnectedControllers(deserializeArgumentsData.controllers);
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
            this.onDestroyed();
        }
    }

    protected get runnerName(): string {
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
                            message: WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR({runnerName: this.runnerName}),
                            stack: error?.stack,
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

    protected connectEnvironmentFactory(config: IConnectEnvironmentConfig): ConnectEnvironment {
        return new ConnectEnvironment(config);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private destroyErrorSerializer(error: any): ISerializedError {
        return this.errorSerializer.serialize(error, new RunnerDestroyError({
            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR({
                runnerName: this.runnerName,
            }),
            stack: error?.stack,
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
