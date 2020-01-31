import { INodeAction, INodeDestroyAction, INodeExecuteAction, INodeInitAction, NodeAction } from '../actions/node.actions';
import { IWorkerAction, WorkerAction } from '../actions/worker.actions';
import { extractError } from '../errors/extract-error';
import { RunnerErrorCode, RunnerErrorMessages } from '../errors/runners-errors';
import { WorkerRunnerState } from '../state/worker-runner.state';
import { IRunnerConstructorParameter, RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { IRunnerArgument, RunnerArgumentType } from '../types/runner-argument';
import { IRunnerResolverConfigBase } from './base-runner.resolver';

export abstract class WorkerRunnerResolverBase<R extends RunnerConstructor> {
    /** {instanceId: WorkerRunnerState} */
    protected runnerStates = new Map<number, WorkerRunnerState<R>>();

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
            let runnerState: WorkerRunnerState<R> ;
            try {
                runnerState = this.buildRunnerState(runnerConstructor,
                    this.deserializeArguments(action.arguments));
            } catch (error) {
                this.sendAction({
                    type: WorkerAction.RUNNER_INIT_ERROR,
                    instanceId: action.instanceId,
                    errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_ERROR,
                    ...extractError(error),
                });
                return;
            }
            this.runnerStates.set(action.instanceId, runnerState);
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

    public deserializeArguments(args: IRunnerArgument[]): Array<IRunnerConstructorParameter> {
        return args.map(argument => {
            switch (argument.type) {
                case RunnerArgumentType.RUNNER_INSTANCE:
                    const instance = this.runnerStates.get(argument.instanceId);
                    if (!instance) {
                        throw new Error(RunnerErrorMessages.INSTANCE_NOT_FOUND);
                    }
                    return instance.runnerInstance;
                default:
                    return argument.data;
            }
        });
    }

    protected buildRunnerState(runnerConstructor: R, runnerArguments: JsonObject[]): WorkerRunnerState<R> {
        return new WorkerRunnerState({
            runnerConstructor,
            runnerArguments,
            workerRunnerResolver: this,
        });
    }

    protected async execute(action: INodeExecuteAction): Promise<void> {
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
            const destroying$ = new Array<Promise<void>>();
            this.runnerStates.forEach((state) => {
                destroying$.push(state.destroy());
            });
            await Promise.all(destroying$);
        }
        this.runnerStates.clear();
        this.sendAction({ type: WorkerAction.WORKER_DESTROYED });
    }

    public sendAction(action: IWorkerAction): void {
        // @ts-ignore
        postMessage(action);
    }
}
