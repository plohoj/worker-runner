import { INodeAction, INodeDestroyAction, INodeExecuteAction, INodeInitAction, INodeWorkerDestroyAction, NodeAction } from '../actions/node.actions';
import { IWorkerAction, IWorkerDestroyedAction, IWorkerRunnerDestroyedAction, IWorkerRunnerExecutedAction, IWorkerRunnerInitAction, WorkerAction } from '../actions/worker.actions';
import { PromisesResolver } from '../runner-promises';

export abstract class WorkerBridgeBase {
    protected runnersPromises = new Map<number, PromisesResolver<IWorkerRunnerExecutedAction>>();
    private initPromises = new PromisesResolver<IWorkerRunnerInitAction>();
    private destroyPromises = new PromisesResolver<IWorkerRunnerDestroyedAction>();
    private destroyWorkerResolver?: () => void;
    private newRunnerInstanceId = 0;

    public execute(action: INodeInitAction): Promise<IWorkerRunnerInitAction>;
    public execute(action: INodeExecuteAction): Promise<IWorkerRunnerExecutedAction>;
    public execute(action: INodeDestroyAction): Promise<IWorkerRunnerDestroyedAction>;
    public execute(action: INodeWorkerDestroyAction): Promise<IWorkerDestroyedAction>;
    public async execute(action: INodeAction): Promise<IWorkerAction> {
        let promise$: Promise<IWorkerAction> | undefined;
        switch (action.type) {
            case NodeAction.INIT:
                promise$ = this.initPromises.promise(action.instanceId);
                break;
            case NodeAction.EXECUTE:
                const runnerPromises = this.getRunnerPromises(action.instanceId);
                promise$ = runnerPromises.promise(action.actionId);
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
        return this.newRunnerInstanceId++;
    }

    public destroy(force = false): Promise<IWorkerDestroyedAction> {
        return this.execute({type: NodeAction.DESTROY_WORKER, force});
    }

    private getRunnerPromises(id: number): PromisesResolver<IWorkerRunnerExecutedAction> {
        const runnerPromises = this.runnersPromises.get(id);
        if (runnerPromises) {
            return runnerPromises;
        }
        const newRunnerPromises = new PromisesResolver<IWorkerRunnerExecutedAction>();
        this.runnersPromises.set(id, newRunnerPromises);
        return newRunnerPromises;
    }

    protected onWorkerMessage(message: MessageEvent): void {
        this.handleWorkerAction(message.data);
    }

    protected handleWorkerAction(action: IWorkerAction): void {
        switch (action.type) {
            case WorkerAction.RUNNER_INIT:
                this.initPromises.resolve(action.instanceId, action);
                break;
            case WorkerAction.RUNNER_INIT_ERROR:
                this.initPromises.reject(action.instanceId, action);
                break;
            case WorkerAction.RUNNER_EXECUTED:
                const runnerPromises = this.runnersPromises.get(action.instanceId);
                if (runnerPromises) {
                    runnerPromises.resolve(action.actionId, action);
                }
                break;
            case WorkerAction.RUNNER_EXECUTE_ERROR:
                const promises = this.runnersPromises.get(action.instanceId);
                if (promises) {
                    promises.reject(action.actionId, action);
                }
                break;
            case WorkerAction.RUNNER_DESTROYED:
                this.destroyPromises.resolve(action.instanceId, action);
                this.runnersPromises.delete(action.instanceId);
                break;
            case WorkerAction.RUNNER_DESTROY_ERROR:
                this.destroyPromises.reject(action.instanceId, action);
                this.runnersPromises.delete(action.instanceId);
                break;
            case WorkerAction.WORKER_DESTROYED:
                if (this.destroyWorkerResolver) {
                    this.destroyWorkerResolver();
                    this.destroyWorkerResolver = undefined;
                }
                break;
        }
    }

    protected abstract sendAction(action: INodeAction): void;
}
