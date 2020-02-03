import { IRunnerControllerDestroyAction, IRunnerControllerExecuteAction, RunnerControllerAction } from '../actions/runner-controller.actions';
import { IRunnerEnvironmentAction, RunnerEnvironmentAction } from '../actions/runner-environment.actions';
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
    private port: MessagePort;
    private onDestroyed: () => void;

    constructor(config: IRunnerEnvironmentConfig<R>) {
        this.runnerInstance = new config.runnerConstructor(...config.runnerArguments) as InstanceType<R>;
        this.workerRunnerResolver = config.workerRunnerResolver;
        this.port = config.port;
        this.port.onmessage = this.onPortMessage.bind(this);
        this.onDestroyed = config.onDestroyed;
    }

    public async execute(action: IRunnerControllerExecuteAction): Promise<void> {
        let response: JsonObject | Promise<JsonObject>;
        try {
            response = this.runnerInstance[action.method](
                ...this.workerRunnerResolver.deserializeArguments(action.args));
        } catch (error) {
            this.sendAction({
                type: RunnerEnvironmentAction.EXECUTE_ERROR,
                errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                ...extractError(error),
                id: action.id,
            });
            return;
        }
        if (response instanceof Promise) {
            try {
                this.handleExecuteResponse(action, await response);
            } catch (error) {
                this.sendAction({
                    type: RunnerEnvironmentAction.EXECUTE_ERROR,
                    errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                    ...extractError(error),
                    id: action.id,
                });
            }
        } else {
            await this.handleExecuteResponse(action, response);
        }
    }

    protected onPortMessage(message: MessageEvent): void {
        this.handleAction(message.data);
    }

    protected async handleAction(
        action: IRunnerControllerExecuteAction | IRunnerControllerDestroyAction,
    ): Promise<void> {
        switch (action.type) {
            case RunnerControllerAction.EXECUTE:
                await this.execute(action);
                break;
            case RunnerControllerAction.DESTROY:
                await this.destroy(action);
                break;
        }
    }

    protected async handleExecuteResponse(action: IRunnerControllerExecuteAction, response: JsonObject): Promise<void> {
        this.sendAction({
            type: RunnerEnvironmentAction.EXECUTED,
            id: action.id,
            response,
        });
    }

    public async destroy(action?: IRunnerControllerDestroyAction): Promise<void> {
        if (this.runnerInstance.destroy) {
            let response: JsonObject | Promise<JsonObject> | void;
            try {
                response = (this.runnerInstance.destroy as () => void | Promise<JsonObject>)();
            } catch (error) {
                action && this.sendAction({
                    type: RunnerEnvironmentAction.DESTROY_ERROR,
                    errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
                    ...extractError(error),
                    id: action.id,
                });
                return;
            }
            if (response instanceof Promise) {
                try {
                    await response;
                } catch (error) {
                    action && this.sendAction({
                        type: RunnerEnvironmentAction.DESTROY_ERROR,
                        errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
                        ...extractError(error),
                        id: action.id,
                    });
                }
            }
            action && this.sendAction({
                type: RunnerEnvironmentAction.DESTROYED,
                id: action.id,
            });
        } else {
            action && this.sendAction({
                type: RunnerEnvironmentAction.DESTROYED,
                id: action.id,
            });
        }
        this.onDestroyed();
    }

    protected sendAction(action: IRunnerEnvironmentAction<Exclude<
        RunnerEnvironmentAction,
        RunnerEnvironmentAction.INITED |  RunnerEnvironmentAction.INIT_ERROR>
    >): void {
        this.port.postMessage(action);
    }
}
