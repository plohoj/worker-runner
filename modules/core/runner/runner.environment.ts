import { IRunnerControllerAction, IRunnerControllerDestroyAction, IRunnerControllerDisconnectAction, IRunnerControllerExecuteAction, IRunnerControllerResolveAction, RunnerControllerAction } from '../actions/runner-controller.actions';
import { IRunnerEnvironmentAction, IRunnerEnvironmentDestroyedAction, IRunnerEnvironmentDestroyErrorAction, IRunnerEnvironmentExecutedAction, IRunnerEnvironmentExecutedWithRunnerResultAction, IRunnerEnvironmentExecuteErrorAction, RunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { extractError } from '../errors/extract-error';
import { RunnerErrorCode } from '../errors/runners-errors';
import { WorkerRunnerResolverBase } from '../resolver/worker-runner.resolver';
import { IRunnerParameter, RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { RunnerBridge, runnerBridgeController } from './runner-bridge';
import { RunnerController } from './runner.controller';

export interface IRunnerEnvironmentConfig<R extends RunnerConstructor> {
    runnerId: number;
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
    private runnerId: number;
    private connectedControllers = new Array<RunnerController<RunnerConstructor>>();

    constructor(config: IRunnerEnvironmentConfig<R>) {
        this.runnerInstance = config.runner;
        this.workerRunnerResolver = config.workerRunnerResolver;
        this.ports.push(config.port);
        config.port.onmessage = this.onPortMessage.bind(this, config.port);
        this.runnerId = config.runnerId;
        this.onDestroyed = config.onDestroyed;
    }

    protected onPortMessage(port: MessagePort, message: MessageEvent): void {
        this.handleAction(port, message.data);
    }

    protected async handleAction(
        port: MessagePort,
        action: IRunnerControllerAction<Exclude<RunnerControllerAction, RunnerControllerAction.INIT>>,
    ): Promise<void> {
        switch (action.type) {
            case RunnerControllerAction.EXECUTE:
                await this.execute(port, action);
                break;
            case RunnerControllerAction.DESTROY:
                await this.destroy(port, action);
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
                type: RunnerEnvironmentAction.EXECUTE_ERROR,
                errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                id: action.id,
                ...extractError(error),
            } as IRunnerEnvironmentExecuteErrorAction);
            await Promise.all(deserializeArgumentsData.controllers
                .map(controller => controller.disconnect()));
            return;
        }
        if (response instanceof Promise) {
            try {
                await this.handleExecuteResponse(port, action, await response);
            } catch (error) {
                this.sendAction(port, {
                    type: RunnerEnvironmentAction.EXECUTE_ERROR,
                    errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                    id: action.id,
                    ...extractError(error),
                } as IRunnerEnvironmentExecuteErrorAction);
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
        this.sendAction(port, {
            type: RunnerEnvironmentAction.DISCONNECTED,
            id: action.id,
        });
        port.onmessage = null;
        port.close();
        if (this.ports.length === 0) {
            this.destroy();
        }
    }

    protected async handleExecuteResponse(
        port: MessagePort,
        action: IRunnerControllerExecuteAction,
        response: IRunnerParameter,
    ): Promise<void> {
        if (RunnerBridge.isRunnerBridge(response)) {
            const runnerControl = await response[runnerBridgeController].resolveControl();
            response.disconnect();
            this.sendAction(
                port,
                {
                    type: RunnerEnvironmentAction.EXECUTED_WITH_RUNNER_RESULT,
                    id: action.id,
                    port: runnerControl.port,
                    runnerId: runnerControl.runnerId,
                } as IRunnerEnvironmentExecutedWithRunnerResultAction,
                [runnerControl.port],
            );
        } else {
            this.sendAction(port, {
                type: RunnerEnvironmentAction.EXECUTED,
                id: action.id,
                response,
            } as IRunnerEnvironmentExecutedAction);
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
        let isActionSended = false;
        if (this.runnerInstance.destroy) {
            let response: JsonObject | Promise<JsonObject> | void;
            try {
                response = (this.runnerInstance.destroy as () => void | Promise<JsonObject>)();
            } catch (error) {
                if (action && port) {
                    this.sendAction(port, {
                        type: RunnerEnvironmentAction.DESTROY_ERROR,
                        errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
                        id: action.id,
                        ...extractError(error),
                    } as IRunnerEnvironmentDestroyErrorAction);
                    isActionSended = true;
                }
            }
            if (response instanceof Promise) {
                try {
                    await response;
                } catch (error) {
                    if (action && port) {
                        this.sendAction(port, {
                            type: RunnerEnvironmentAction.DESTROY_ERROR,
                            errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
                            id: action.id,
                            ...extractError(error),
                        } as IRunnerEnvironmentDestroyErrorAction);
                        isActionSended = true;
                    }
                }
            }
        }
        if (port) {
            if (action && !isActionSended) {
                this.sendAction(port, {
                    type: RunnerEnvironmentAction.DESTROYED,
                    id: action.id,
                } as IRunnerEnvironmentDestroyedAction);
            }
            const portIndex = this.ports.indexOf(port);
            this.ports.splice(portIndex, 1);
            port.onmessage = null;
            port.close();
        }
        this.notifyControllersAboutDestruction();
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
                runnerId: this.runnerId,
            },
            [messageChanel.port2],
        );
    }

    protected sendAction(
        port: MessagePort,
        action: IRunnerEnvironmentAction<Exclude<
            RunnerEnvironmentAction,
            RunnerEnvironmentAction.INITED |  RunnerEnvironmentAction.INIT_ERROR>
        >,
        transfer?: Transferable[],
    ): void {
        port.postMessage(action, transfer as Transferable[]);
    }
}
