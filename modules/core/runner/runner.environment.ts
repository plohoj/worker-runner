import { IRunnerControllerDestroyAction, IRunnerControllerExecuteAction, RunnerControllerAction } from '../actions/runner-controller.actions';
import { IRunnerEnvironmentAction, IRunnerEnvironmentDestroyedAction, IRunnerEnvironmentDestroyErrorAction, IRunnerEnvironmentExecutedAction, IRunnerEnvironmentExecuteErrorAction, RunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { extractError } from '../errors/extract-error';
import { RunnerErrorCode } from '../errors/runners-errors';
import { WorkerRunnerResolverBase } from '../resolver/worker-runner.resolver';
import { RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';

export interface IRunnerEnvironmentConfig<R extends RunnerConstructor> {
    runnerConstructor: R;
    runnerArguments: JsonObject[];
    workerRunnerResolver: WorkerRunnerResolverBase<R>;
    port: MessagePort;
    onDestroyed: () => void;
}

export class RunnerEnvironment<R extends RunnerConstructor> {
    public runnerInstance: InstanceType<R>;
    private workerRunnerResolver: WorkerRunnerResolverBase<R>;
    private port = new Array<MessagePort>();
    private onDestroyed: () => void;

    constructor(config: IRunnerEnvironmentConfig<R>) {
        this.runnerInstance = new config.runnerConstructor(...config.runnerArguments) as InstanceType<R>;
        this.workerRunnerResolver = config.workerRunnerResolver;
        this.port.push(config.port);
        config.port.onmessage = this.onPortMessage.bind(this, config.port);
        this.onDestroyed = config.onDestroyed;
    }

    protected onPortMessage(port: MessagePort, message: MessageEvent): void {
        this.handleAction(port, message.data);
    }

    protected async handleAction(
        port: MessagePort,
        action: IRunnerControllerExecuteAction | IRunnerControllerDestroyAction,
    ): Promise<void> {
        switch (action.type) {
            case RunnerControllerAction.EXECUTE:
                await this.execute(port, action);
                break;
            case RunnerControllerAction.DESTROY:
                await this.destroy(port, action);
                break;
        }
    }

    public async execute(
        port: MessagePort,
        action: IRunnerControllerExecuteAction,
    ): Promise<void> {
        let response: JsonObject | Promise<JsonObject>;
        try {
            response = this.runnerInstance[action.method](
                ...this.workerRunnerResolver.deserializeArguments(action.args));
        } catch (error) {
            this.sendAction(port, {
                type: RunnerEnvironmentAction.EXECUTE_ERROR,
                errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                id: action.id,
                ...extractError(error),
            } as IRunnerEnvironmentExecuteErrorAction);
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
                return;
            }
        } else {
            await this.handleExecuteResponse(port, action, response);
        }
    }

    protected async handleExecuteResponse(
        port: MessagePort,
        action: IRunnerControllerExecuteAction,
        response: JsonObject,
    ): Promise<void> {
        this.sendAction(port, {
            type: RunnerEnvironmentAction.EXECUTED,
            id: action.id,
            response,
        } as IRunnerEnvironmentExecutedAction);
    }

    public async destroy(
        port?: MessagePort,
        action?: IRunnerControllerDestroyAction,
    ): Promise<void> {
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
                }
                return;
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
                    }
                }
                return;
            }
        }
        if (action && port) {
            this.sendAction(port, {
                type: RunnerEnvironmentAction.DESTROYED,
                id: action.id,
            } as IRunnerEnvironmentDestroyedAction);
        }
        this.onDestroyed();
    }

    protected sendAction(
        port: MessagePort,
        action: IRunnerEnvironmentAction<Exclude<
        RunnerEnvironmentAction,
        RunnerEnvironmentAction.INITED |  RunnerEnvironmentAction.INIT_ERROR>
    >): void {
        port.postMessage(action);
    }
}
