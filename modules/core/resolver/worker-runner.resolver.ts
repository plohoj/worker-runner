import { RunnerConstructor } from '@core/types/constructor';
import { JsonObject } from '@core/types/json-object';
import { INodeAction, INodeDestroyAction, INodeExecuteAction, INodeInitAction, NodeAction } from '../actions/node.actions';
import { IWorkerAction, WorkerAction } from '../actions/worker.actions';
import { extractError } from '../errors/extract-error';
import { RunnerErrorCode, RunnerErrorMessages } from '../errors/runners-errors';
import { IRunnerResolverConfigBase } from './base-runner.resolver';

export abstract class WorkerRunnerResolverBase<R extends RunnerConstructor> {
    private runnerInstances = new Map<number, InstanceType<R>>();

    constructor(protected config: Required<IRunnerResolverConfigBase<R>>) {}

    public run(): void {
        self.addEventListener('message', this.onMessage.bind(this));
        this.sendAction({type: WorkerAction.WORKER_INIT});
    }

    private onMessage(message: MessageEvent): void {
        this.handleAction(message.data);
    }

    public handleAction(action: INodeAction): void {
        switch (action.type) {
            case NodeAction.INIT:
                this.initRunnerInstance(action);
                break;
            case NodeAction.EXECUTE:
                this.execute(action);
                break;
            case NodeAction.DESTROY:
                this.destroyRunnerInstance(action);
                break;
            case NodeAction.DESTROY_WORKER:
                this.destroyWorker(action.force);
                break;
        }
    }

    private initRunnerInstance(action: INodeInitAction): void {
        const runnerConstructor = this.config.runners[action.runnerId];
        if (runnerConstructor) {
            let instance: InstanceType<R> ;
            try {
                instance = new runnerConstructor(...action.arguments) as InstanceType<R>;
            } catch (error) {
                this.sendAction({
                    type: WorkerAction.RUNNER_INIT_ERROR,
                    instanceId: action.instanceId,
                    errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_ERROR,
                    ...extractError(error),
                });
                return;
            }
            this.runnerInstances.set(action.runnerId, instance);
            this.sendAction({
                type: WorkerAction.RUNNER_INIT,
                instanceId: action.instanceId,
            });
        } else {
            this.sendAction({
                type: WorkerAction.RUNNER_INIT_ERROR,
                instanceId: action.instanceId,
                errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND,
                error: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
            });
        }
    }

    private execute(action: INodeExecuteAction): void {
        const runner = this.runnerInstances.get(action.instanceId);
        if (runner) {
            let response;
            try {
                response = runner[action.method](...action.arguments);
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
                response.then(resolvedResponse => this.sendAction({
                    type: WorkerAction.RUNNER_EXECUTED,
                    actionId: action.actionId,
                    instanceId: action.instanceId,
                    response: resolvedResponse,
                })).catch(error => this.sendAction({
                    type: WorkerAction.RUNNER_EXECUTE_ERROR,
                    errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                    ...extractError(error),
                    actionId: action.actionId,
                    instanceId: action.instanceId,
                }));
            } else {
                this.handleExecuteResponse(action, response);
            }
        }  else {
            this.sendAction({
                type: WorkerAction.RUNNER_EXECUTE_ERROR,
                errorCode: RunnerErrorCode.RUNNER_EXECUTE_INSTANCE_NOT_FOUND,
                error: RunnerErrorMessages.INSTANCE_NOT_FOUND,
                actionId: action.actionId,
                instanceId: action.instanceId,
            });
        }
    }

    protected handleExecuteResponse(action: INodeExecuteAction, response: any): void {
        this.sendAction({
            type: WorkerAction.RUNNER_EXECUTED,
            actionId: action.actionId,
            instanceId: action.instanceId,
            response,
        });
    }

    private destroyRunnerInstance(action: INodeDestroyAction): void {
        const destroyRunner = this.runnerInstances.get(action.instanceId);
        if (destroyRunner) {
            this.runnerInstances.delete(action.instanceId);
            let response: JsonObject | Promise<JsonObject> | void;
            if (destroyRunner.destroy) {
                try {
                    response = (destroyRunner.destroy as () => void | Promise<JsonObject>)();
                } catch (error) {
                    this.sendAction({
                        type: WorkerAction.RUNNER_DESTROY_ERROR,
                        errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
                        ...extractError(error),
                        instanceId: action.instanceId,
                    });
                    return;
                }
                if (response instanceof Promise) {
                    response.then(resolvedResponse => this.sendAction({
                        type: WorkerAction.RUNNER_DESTROYED,
                        instanceId: action.instanceId,
                    })).catch(error => this.sendAction({
                        type: WorkerAction.RUNNER_DESTROY_ERROR,
                        errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
                        ...extractError(error),
                        instanceId: action.instanceId,
                    }));
                } else {
                    this.sendAction({
                        type: WorkerAction.RUNNER_DESTROYED,
                        instanceId: action.instanceId,
                    });
                }
            } else {
                this.sendAction({
                    type: WorkerAction.RUNNER_DESTROYED,
                    instanceId: action.instanceId,
                });
            }
        }  else {
            this.sendAction({
                type: WorkerAction.RUNNER_DESTROY_ERROR,
                errorCode: RunnerErrorCode.RUNNER_DESTROY_INSTANCE_NOT_FOUND,
                error: RunnerErrorMessages.INSTANCE_NOT_FOUND,
                instanceId: action.instanceId,
            });
        }
    }

    public async destroyWorker(force = false): Promise<void> {
        if (!force) {
            const destroying$ = new Array<Promise<any>>();
            this.runnerInstances.forEach(runner => {
                if ('destroy' in runner) {
                    let destroyResult: any;
                    try {
                        destroyResult = runner.destroy();
                    } catch {
                        return;
                    }
                    if (destroyResult instanceof Promise) {
                        destroying$.push(destroyResult.catch());
                    }
                }
            });
            await Promise.all(destroying$);
        }
        this.sendAction({ type: WorkerAction.WORKER_DESTROYED });
    }

    public sendAction(action: IWorkerAction): void {
        // @ts-ignore
        postMessage(action);
    }
}
