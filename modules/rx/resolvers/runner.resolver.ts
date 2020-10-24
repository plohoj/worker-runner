import { INodeRunnerResolverConfigBase, RunnersList } from '@worker-runner/core';
import { RxNodeRunnerResolver } from './node-runner.resolver';
import { RxWorkerRunnerResolver } from './worker-runner.resolver';

/** @deprecated use **RxNodeRunnerResolver** and **RxWorkerRunnerResolver** */
export class RxRunnerResolver<L extends RunnersList> extends RxNodeRunnerResolver<L> {
    private workerRunnerResolver: RxWorkerRunnerResolver<L>;

    /** @deprecated use **NodeRunnerResolver** and **WorkerRunnerResolver** */
    constructor(config: INodeRunnerResolverConfigBase<L>) {
        super(config);
        this.workerRunnerResolver = new RxWorkerRunnerResolver(config);
    }

    public runInWorker(): void {
        this.workerRunnerResolver.run();
    }
}
