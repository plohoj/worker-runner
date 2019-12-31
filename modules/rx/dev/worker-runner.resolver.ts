import { Constructor, IWorkerAction } from '@worker-runner/core';
import { RxWorkerRunnerResolver } from '../resolvers/worker-runner.resolver';
import { RxDevWorkerBridge } from './worker-bridge';

export class RxDevWorkerRunnerResolver<R extends Constructor<{[key: string]: any}>> extends RxWorkerRunnerResolver<R> {
    public workerBridge = new RxDevWorkerBridge(this);

    public sendAction(action: IWorkerAction): void {
        this.workerBridge.handleWorkerAction(action);
    }
}
