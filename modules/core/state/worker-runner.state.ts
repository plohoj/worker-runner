import { INodeDestroyAction, INodeExecuteAction } from '../actions/node.actions';
import { IWorkerAction, WorkerAction } from '../actions/worker.actions';
import { extractError } from '../errors/extract-error';
import { RunnerErrorCode } from '../errors/runners-errors';
import { WorkerRunnerResolverBase } from '../resolver/worker-runner.resolver';
import { RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';

interface IWorkerRunnerStateConfig<R extends RunnerConstructor> {
    runnerConstructor: R;
    runnerArguments: JsonObject[];
    workerRunnerResolver: WorkerRunnerResolverBase<R>;
}

export class WorkerRunnerState<R extends RunnerConstructor> {
    public runnerInstance: InstanceType<R>;
    private workerRunnerResolver: WorkerRunnerResolverBase<R>;

    constructor(config: IWorkerRunnerStateConfig<R>) {
        this.runnerInstance = new config.runnerConstructor(...config.runnerArguments) as InstanceType<R>;
        this.workerRunnerResolver = config.workerRunnerResolver;
    }

    public async execute(action: INodeExecuteAction): Promise<void> {
        let response: JsonObject;
        try {
            response = this.runnerInstance[action.method](
                ...this.workerRunnerResolver.deserializeArguments(action.arguments));
        } catch (error) {
            this.sendAction({
                type: WorkerAction.RUNNER_EXECUTE_ERROR,
                errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                ...extractError(error),
                actionId: action.actionId,
                instanceId: action.instanceId,
            });
            return;
        }
        if (response instanceof Promise) {
            let resolvedResponse: JsonObject;
            try {
                resolvedResponse = await response;
                this.sendAction({
                    type: WorkerAction.RUNNER_EXECUTED,
                    actionId: action.actionId,
                    instanceId: action.instanceId,
                    response: resolvedResponse,
                });
            } catch (error) {
                this.sendAction({
                    type: WorkerAction.RUNNER_EXECUTE_ERROR,
                    errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                    ...extractError(error),
                    actionId: action.actionId,
                    instanceId: action.instanceId,
                });
            }
        } else {
            await this.handleExecuteResponse(action, response);
        }
    }

    protected async handleExecuteResponse(action: INodeExecuteAction, response: JsonObject): Promise<void> {
        this.sendAction({
            type: WorkerAction.RUNNER_EXECUTED,
            actionId: action.actionId,
            instanceId: action.instanceId,
            response,
        });
    }

    public async destroy(action?: INodeDestroyAction): Promise<void> {
        let response: JsonObject | Promise<JsonObject> | void;
        if (this.runnerInstance.destroy) {
            try {
                response = (this.runnerInstance.destroy as () => void | Promise<JsonObject>)();
            } catch (error) {
                action && this.sendAction({
                    type: WorkerAction.RUNNER_DESTROY_ERROR,
                    errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
                    ...extractError(error),
                    instanceId: action.instanceId,
                });
                return;
            }
            if (response instanceof Promise) {
                try {
                    await response;
                    action && this.sendAction({
                        type: WorkerAction.RUNNER_DESTROYED,
                        instanceId: action.instanceId,
                    });
                } catch (error) {
                    action && this.sendAction({
                        type: WorkerAction.RUNNER_DESTROY_ERROR,
                        errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
                        ...extractError(error),
                        instanceId: action.instanceId,
                    });
                }
            } else {
                action && this.sendAction({
                    type: WorkerAction.RUNNER_DESTROYED,
                    instanceId: action.instanceId,
                });
            }
        } else {
            action && this.sendAction({
                type: WorkerAction.RUNNER_DESTROYED,
                instanceId: action.instanceId,
            });
        }
    }

    protected sendAction(action: IWorkerAction): void {
        this.workerRunnerResolver.sendAction(action);
    }
}
