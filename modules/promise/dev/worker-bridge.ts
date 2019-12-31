import { INodeAction, IWorkerAction, IWorkerDestroyedAction, WorkerBridge, WorkerRunnerResolverBase } from '@worker-runner/core';

export class DevWorkerBridge extends WorkerBridge {
    constructor(private workerRunnerResolver: WorkerRunnerResolverBase<any>) {
        super({workerName: 'Dev worker', workerPath: 'virtual'});
        workerRunnerResolver.sendAction = this.handleWorkerAction.bind(this);
    }

    /** @deprecated No need to call in development mode */
    public async init(): Promise<void> {
        // Nothing to do
    }

    public sendAction(action: INodeAction): void {
        this.workerRunnerResolver.handleAction(action);
    }

    public handleWorkerAction(action: IWorkerAction): void {
        super.handleWorkerAction(action);
    }

    public async destroy(force = false): Promise<IWorkerDestroyedAction> {
        const destroyResult: IWorkerDestroyedAction = await this.sendDestroy(force);
        this.destroyRunnerState();
        return destroyResult;
    }
}
