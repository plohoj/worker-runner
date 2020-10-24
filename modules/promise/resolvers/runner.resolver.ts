import { INodeRunnerResolverConfigBase, RunnersList } from '@worker-runner/core';
import { NodeRunnerResolver } from './node-runner.resolver';
import { WorkerRunnerResolver } from './worker-runner.resolver';

/** @deprecated use **NodeRunnerResolver** and **WorkerRunnerResolver** */
export class RunnerResolver<L extends RunnersList> extends NodeRunnerResolver<L> {
    private workerRunnerResolver: WorkerRunnerResolver<L>;

    /** @deprecated use **NodeRunnerResolver** and **WorkerRunnerResolver** */
    constructor(config: INodeRunnerResolverConfigBase<L>) {
        super(config);
        this.workerRunnerResolver = new WorkerRunnerResolver(config);
    }

    public runInWorker(): void {
        this.workerRunnerResolver.run();
    }
}
