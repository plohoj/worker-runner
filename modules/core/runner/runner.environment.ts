import { IRunnerControllerAction, IRunnerControllerDestroyAction, IRunnerControllerDisconnectAction, IRunnerControllerExecuteAction, IRunnerControllerResolveAction, RunnerControllerAction } from '../actions/runner-controller.actions';
import { IRunnerEnvironmentAction, IRunnerEnvironmentDestroyErrorAction, RunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { WorkerRunnerErrorCode } from '../errors/error-code';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../errors/error-message';
import { WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RunnerDestroyError, RunnerExecuteError } from '../errors/runner-errors';
import { WorkerRunnerResolverBase } from '../resolver/worker-runner.resolver';
import { IRunnerMethodResult, IRunnerSerializedMethodResult, RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { TransferRunnerData } from '../utils/transfer-runner-data';
import { RunnerBridge, RUNNER_BRIDGE_CONTROLLER } from './runner-bridge';
import { RunnerController } from './runner.controller';

export interface IRunnerEnvironmentConfig<R extends RunnerConstructor> {
    runner: InstanceType<R>;
    workerRunnerResolver: WorkerRunnerResolverBase<R>;
    port: MessagePort;
    onDestroyed: () => void;
}

export class RunnerEnvironment<R extends RunnerConstructor> {
    public runnerInstance: InstanceType<R>;
    private workerRunnerResolver: WorkerRunnerResolverBase<R>;
    private ports = new Array<MessagePort>();
    private onDestroyed: () => void;
    private connectedControllers = new Array<RunnerController<RunnerConstructor>>();

    protected readonly errorSerializer: WorkerRunnerErrorSerializer = WORKER_RUNNER_ERROR_SERIALIZER;

    constructor(config: Readonly<IRunnerEnvironmentConfig<R>>) {
        this.runnerInstance = config.runner;
        this.workerRunnerResolver = config.workerRunnerResolver;
        this.ports.push(config.port);
        config.port.onmessage = this.onPortMessage.bind(this, config.port);
        this.onDestroyed = config.onDestroyed;
    }

    protected onPortMessage(port: MessagePort, message: MessageEvent): void {
        this.handleAction(port, message.data);
    }

    protected get runnerName(): string {
        return this.runnerInstance.constructor.name;
    }

    protected async handleAction(
        port: MessagePort,
        action: IRunnerControllerAction,
    ): Promise<void> {
        switch (action.type) {
            case RunnerControllerAction.EXECUTE:
                try {
                    await this.execute(port, action);
                } catch (error) {
                    this.sendAction(port, {
                        id: action.id,
                        type: RunnerEnvironmentAction.EXECUTE_ERROR,
                        ... this.errorSerializer.serialize(error, {
                            errorCode: WorkerRunnerErrorCode.RUNNER_EXECUTE_ERROR,
                            name: RunnerExecuteError.name,
                            message: WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR({runnerName: this.runnerName}),
                            stack: error?.stack || new Error().stack,
                        }),
                    });
                }
                break;
            case RunnerControllerAction.DESTROY:
                try {
                    await this.destroy(port, action);
                } catch (error) {
                    this.sendAction(port, {
                        id: action.id,
                        type: RunnerEnvironmentAction.DESTROY_ERROR,
                        ... this.errorSerializer.serialize(error, {
                            errorCode: WorkerRunnerErrorCode.RUNNER_DESTROY_ERROR,
                            name: RunnerDestroyError.name,
                            message: WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR({runnerName: this.runnerName}),
                            stack: error?.stack || new Error().stack,
                        }),
                    });
                }
                break;
            case RunnerControllerAction.RESOLVE:
                await this.resolve(port, action);
                break;
            case RunnerControllerAction.DISCONNECT:
                await this.disconnect(port, action);
                break;
        }
    }

    public async execute(
        port: MessagePort,
        action: IRunnerControllerExecuteAction,
    ): Promise<void> {
        let response: JsonObject | Promise<JsonObject>;
        const deserializeArgumentsData = this.workerRunnerResolver.deserializeArguments(action.args);
        try {
            response = this.runnerInstance[action.method](...deserializeArgumentsData.args);
        } catch (error) {
            this.sendAction(port, {
                id: action.id,
                type: RunnerEnvironmentAction.EXECUTE_ERROR,
                ... this.errorSerializer.serialize(error, {
                    errorCode: WorkerRunnerErrorCode.RUNNER_EXECUTE_ERROR,
                    message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR({
                        runnerName: this.runnerName,
                        methodName: action.method,
                    }),
                    name: RunnerExecuteError.name,
                    stack: error?.stack || new Error().stack,
                }),
            });
            await Promise.all(deserializeArgumentsData.controllers
                .map(controller => controller.disconnect()));
            return;
        }
        if (response instanceof Promise) {
            try {
                await this.handleExecuteResponse(port, action, await response);
            } catch (error) {
                this.sendAction(port, {
                    id: action.id,
                    type: RunnerEnvironmentAction.EXECUTE_ERROR,
                    ... this.errorSerializer.serialize(error, {
                        errorCode: WorkerRunnerErrorCode.RUNNER_EXECUTE_ERROR,
                        message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR({
                            runnerName: this.runnerName,
                            methodName: action.method,
                        }),
                        name: RunnerExecuteError.name,
                        stack: error?.stack || new Error().stack,
                    }),
                });
                await Promise.all(deserializeArgumentsData.controllers
                    .map(controller => controller.disconnect()));
                return;
            }
        } else {
            await this.handleExecuteResponse(port, action, response);
        }
        this.addConnectedControllers(deserializeArgumentsData.controllers);
    }

    public addConnectedControllers(controllers: RunnerController<RunnerConstructor>[]): void {
        this.connectedControllers.push(...controllers);
    }

    private async disconnect(port: MessagePort, action: IRunnerControllerDisconnectAction): Promise<void> {
        const portIndex = this.ports.indexOf(port);
        this.ports.splice(portIndex, 1);
        if (this.ports.length === 0) {
            await this.destroy();
        }
        this.sendAction(port, {
            type: RunnerEnvironmentAction.DISCONNECTED,
            id: action.id,
        });
        port.onmessage = null;
        port.close();
    }

    protected async handleExecuteResponse(
        port: MessagePort,
        action: IRunnerControllerExecuteAction,
        responseWithTransferData: IRunnerMethodResult,
        transferable: Transferable[] = [],
    ): Promise<void> {
        let response: IRunnerSerializedMethodResult;
        if (responseWithTransferData instanceof TransferRunnerData) {
            transferable.push(...responseWithTransferData.transfer);
            response = responseWithTransferData.data;
        } else {
            response = responseWithTransferData;
        }
        if (RunnerBridge.isRunnerBridge(response)) {
            const runnerController = await response[RUNNER_BRIDGE_CONTROLLER];
            const transferPort: MessagePort = await runnerController.resolveOrTransferControl();
            this.sendAction(
                port,
                {
                    type: RunnerEnvironmentAction.EXECUTED_WITH_RUNNER_RESULT,
                    id: action.id,
                    port: transferPort,
                    runnerId: runnerController.runnerId,
                },
                [transferPort, ...transferable],
            );
        } else {
            this.sendAction(
                port,
                {
                    type: RunnerEnvironmentAction.EXECUTED,
                    id: action.id,
                    response: response as JsonObject,
                },
                transferable,
            );
        }
    }

    private notifyControllersAboutDestruction(): void {
        for (const port of this.ports) {
            this.sendAction(port, {
                type: RunnerEnvironmentAction.DESTROYED,
                id: -1,
            });
            port.onmessage = null;
            port.close();
        }
        this.ports = [];
    }

    public async destroy(
        port?: MessagePort,
        action?: IRunnerControllerDestroyAction,
    ): Promise<void> {
        let destroyError: IRunnerEnvironmentDestroyErrorAction | undefined;
        if (this.runnerInstance.destroy) {
            let response: JsonObject | Promise<JsonObject> | void;
            try {
                response = (this.runnerInstance.destroy as () => void | Promise<JsonObject>)();
            } catch (error) {
                if (action && port) {
                    destroyError = {
                        id: action.id,
                        type: RunnerEnvironmentAction.DESTROY_ERROR,
                        ... this.errorSerializer.serialize(error, {
                            errorCode: WorkerRunnerErrorCode.RUNNER_DESTROY_ERROR,
                            message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR({
                                runnerName: this.runnerName,
                                methodName: 'destroy',
                            }),
                            name: RunnerExecuteError.name,
                            stack: error?.stack || new Error().stack,
                        }),
                    };
                }
            }
            if (response instanceof Promise) {
                try {
                    await response;
                } catch (error) {
                    if (action && port) {
                        destroyError = {
                            id: action.id,
                            type: RunnerEnvironmentAction.DESTROY_ERROR,
                            ... this.errorSerializer.serialize(error, {
                                errorCode: WorkerRunnerErrorCode.RUNNER_DESTROY_ERROR,
                                message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR({
                                    runnerName: this.runnerName,
                                    methodName: 'destroy',
                                }),
                                name: RunnerExecuteError.name,
                                stack: error?.stack || new Error().stack,
                            }),
                        };
                    }
                }
            }
        }
        if (port) {
            const portIndex = this.ports.indexOf(port);
            this.ports.splice(portIndex, 1);
            port.onmessage = null;
            this.notifyControllersAboutDestruction();
            if (action) {
                this.sendAction(port, destroyError || {
                    id: action.id,
                    type: RunnerEnvironmentAction.DESTROYED,
                });
            }
            port.close();
        } else {
            this.notifyControllersAboutDestruction();
        }
        this.onDestroyed();
    }

    private async resolve(port: MessagePort, action: IRunnerControllerResolveAction): Promise<void> {
        const messageChanel = new MessageChannel();
        messageChanel.port1.onmessage = this.onPortMessage.bind(this, messageChanel.port1);
        this.ports.push(messageChanel.port1);
        this.sendAction(
            port,
            {
                type: RunnerEnvironmentAction.RESOLVED,
                id: action.id,
                port: messageChanel.port2,
            },
            [messageChanel.port2],
        );
    }

    protected sendAction(
        port: MessagePort,
        action: IRunnerEnvironmentAction,
        transfer?: Transferable[],
    ): void {
        port.postMessage(action, transfer as Transferable[]);
    }
}
