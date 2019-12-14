import { RunnerState } from '@core/runner-state';
import { RunnerConstructor } from '@core/types/constructor';
import { JsonObject } from '@core/types/json-object';
import { INodeAction, INodeDestroyAction, INodeExecuteAction, INodeInitAction, NodeAction } from '../actions/node.actions';
import { IWorkerAction, WorkerAction } from '../actions/worker.actions';
import { extractError } from '../errors/extract-error';
import { RunnerErrorCode, RunnerErrorMessages } from '../errors/runners-errors';
import { IRunnerResolverConfigBase } from './base-runner.resolver';

export abstract class WorkerRunnerResolverBase<R extends RunnerConstructor> {
    protected runnerStates = new Map<number, RunnerState<R>>();

    constructor(protected config: IRunnerResolverConfigBase<R>) {}

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
            let runnerState: RunnerState<R> ;
            try {
                runnerState = this.buildRunnerState(runnerConstructor, action.arguments);
            } catch (error) {
                this.sendAction({
                    type: WorkerAction.RUNNER_INIT_ERROR,
                    instanceId: action.instanceId,
                    errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_ERROR,
                    ...extractError(error),
                });
                return;
            }
            this.runnerStates.set(action.runnerId, runnerState);
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

    protected buildRunnerState(runnerConstructor: R, runnerArguments: JsonObject[]): RunnerState<R> {
        return new RunnerState({
            runnerConstructor,
            runnerArguments,
            workerRunnerResolver: this,
        });
    }

    private async execute(action: INodeExecuteAction): Promise<void> {
        const runnerState = this.runnerStates.get(action.instanceId);
        if (runnerState) {
            await runnerState.execute(action);
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

    private async destroyRunnerInstance(action: INodeDestroyAction): Promise<void> {
        const runnerState = this.runnerStates.get(action.instanceId);
        if (runnerState) {
            await runnerState.destroy(action);
            this.runnerStates.delete(action.instanceId);
        } else {
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
            this.runnerStates.forEach((state) => {
                destroying$.push(state.destroy());
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
