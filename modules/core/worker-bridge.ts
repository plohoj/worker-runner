import { INodeAction, INodeDestroyAction, INodeExecuteAction, INodeInitAction, INodeWorkerDestroyAction, NodeAction } from './actions/node.actions';
import { IRunnerError } from './actions/runner-error';
import { IWorkerAction, IWorkerDestroyedAction, IWorkerRunnerDestroyedAction, IWorkerRunnerExecutedAction, IWorkerRunnerInitAction, WorkerAction } from './actions/worker.actions';
import { extractError } from './errors/extract-error';
import { RunnerErrorCode, RunnerErrorMessages } from './errors/runners-errors';
import { PromisesResolver } from './runner-promises';
import { NodeRunnerState } from './state/node-runner.state';

interface IWorkerConfig {
    workerPath: string;
    workerName: string;
}

export class WorkerBridge {
    /** {instanceId: NodeRunnerState} */
    protected runnerStates = new Map<number, NodeRunnerState>();
    private initPromises = new PromisesResolver<IWorkerRunnerInitAction>();
    private destroyPromises = new PromisesResolver<IWorkerRunnerDestroyedAction>();
    private destroyWorkerResolver?: () => void;
    private lastRunnerInstanceId = 0;

    private worker?: Worker;
    private workerMessageHandler = this.onWorkerMessage.bind(this);

    constructor(private config: IWorkerConfig) {}

    public async execute(action: INodeInitAction): Promise<IWorkerRunnerInitAction>;
    public async execute(action: INodeExecuteAction): Promise<IWorkerRunnerExecutedAction>;
    public async execute(action: INodeDestroyAction): Promise<IWorkerRunnerDestroyedAction>;
    public async execute(action: INodeWorkerDestroyAction): Promise<IWorkerDestroyedAction>;
    public async execute(action: INodeAction): Promise<IWorkerAction>;
    public async execute(action: INodeAction): Promise<IWorkerAction> {
        let promise$: Promise<IWorkerAction> | undefined;
        switch (action.type) {
            case NodeAction.INIT:
                promise$ = this.initPromises.promise(action.instanceId);
                break;
            case NodeAction.EXECUTE:
                const runnerState = this.runnerStates.get(action.instanceId);
                if (!runnerState) {
                    throw {
                        error: new Error(RunnerErrorMessages.INSTANCE_NOT_FOUND),
                        errorCode: RunnerErrorCode.RUNNER_EXECUTE_INSTANCE_NOT_FOUND,
                        message: RunnerErrorMessages.INSTANCE_NOT_FOUND,
                    } as IRunnerError;
                }
                promise$ = runnerState.executePromises.promise(action.actionId);
                break;
            case NodeAction.DESTROY:
                promise$ = this.destroyPromises.promise(action.instanceId);
                break;
            case NodeAction.DESTROY_WORKER:
                promise$ = new Promise(resolver => {
                    this.destroyWorkerResolver = resolver;
                });
                break;
        }
        if (promise$) {
            this.sendAction(action);
            return promise$;
        }
        throw Error(`Action "${action.type}" not found`);
    }

    public resolveNewRunnerInstanceId(): number {
        return this.lastRunnerInstanceId++;
    }

    protected onWorkerMessage(message: MessageEvent): void {
        this.handleWorkerAction(message.data);
    }

    protected handleWorkerAction(action: IWorkerAction): void {
        switch (action.type) {
            case WorkerAction.RUNNER_INIT:
                this.initRunnerState(action.instanceId);
                this.initPromises.resolve(action.instanceId, action);
                break;
            case WorkerAction.RUNNER_INIT_ERROR:
                this.initPromises.reject(action.instanceId, action);
                break;
            case WorkerAction.RUNNER_EXECUTED:
                this.getRunnerState(action.instanceId).executePromises.resolve(action.actionId, action);
                break;
            case WorkerAction.RUNNER_EXECUTE_ERROR:
                this.getRunnerState(action.instanceId).executePromises.reject(action.actionId, action);
                break;
            case WorkerAction.RUNNER_DESTROYED:
                this.destroyPromises.resolve(action.instanceId, action);
                this.getRunnerState(action.instanceId).destroy();
                this.runnerStates.delete(action.instanceId);
                break;
            case WorkerAction.RUNNER_DESTROY_ERROR:
                this.destroyPromises.reject(action.instanceId, action);
                this.runnerStates.get(action.instanceId)?.destroy();
                this.runnerStates.delete(action.instanceId);
                break;
            case WorkerAction.WORKER_DESTROYED:
                if (this.destroyWorkerResolver) {
                    this.destroyWorkerResolver();
                    this.destroyWorkerResolver = undefined;
                }
                break;
        }
    }

    protected getRunnerState(instanceId: number): NodeRunnerState {
        const runnerStateWithError = this.runnerStates.get(instanceId);
        if (!runnerStateWithError) {
            throw Error(RunnerErrorMessages.INSTANCE_NOT_FOUND);
        }
        return runnerStateWithError;
    }

    protected initRunnerState(instanceId: number): void {
        this.runnerStates.set(instanceId, new NodeRunnerState());
    }

    public async init(): Promise<void> {
        const worker = new Worker(this.config.workerPath, { name: this.config.workerName });
        await new Promise(resolve => {
            worker.onmessage = (message) => {
                if (message.data && message.data.type === WorkerAction.WORKER_INIT) {
                    resolve();
                }
            };
        });
        this.worker = worker;
        this.worker.addEventListener('message', this.workerMessageHandler);
    }

    protected sendDestroy(force?: boolean): Promise<IWorkerDestroyedAction> {
        return this.execute({type: NodeAction.DESTROY_WORKER, force});
    }

    protected destroyRunnerState(): void {
        this.runnerStates.forEach(state => state.destroy());
        this.runnerStates.clear();
    }

    public async destroy(force = false): Promise<IWorkerDestroyedAction> {
        if (this.worker) {
            const destroyResult: IWorkerDestroyedAction = await this.sendDestroy(force);
            this.destroyRunnerState();
            this.worker.terminate();
            this.worker = undefined;
            return destroyResult;
        } else {
            throw extractError(new Error(RunnerErrorMessages.WORKER_BRIDGE_NOT_INIT));
        }
    }

    protected sendAction(action: INodeAction): void {
        if (this.worker) {
            this.worker.postMessage(action);
        } else {
            const error = new Error(RunnerErrorMessages.WORKER_BRIDGE_NOT_INIT);
            this.handleWorkerAction({
                type: WorkerAction.WORKER_ERROR,
                error,
                message: RunnerErrorMessages.WORKER_BRIDGE_NOT_INIT,
                stacktrace: error.stack,
            });
        }
    }
}
