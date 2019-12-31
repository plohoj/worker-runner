import { Constructor, IWorkerAction, WorkerRunnerResolverBase } from '@worker-runner/core';
import { DevWorkerBridge } from './worker-bridge';

export class DevWorkerRunnerResolver<R extends Constructor<{[key: string]: any}>> extends WorkerRunnerResolverBase<R> {
    public workerBridge = new DevWorkerBridge(this);

    public sendAction(action: IWorkerAction): void {
        this.workerBridge.handleWorkerAction(action);
    }
}
