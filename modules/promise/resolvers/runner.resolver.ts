import { INodeRunnerResolverConfigBase, RunnerConstructor } from '@worker-runner/core';
import { NodeRunnerResolver } from './node-runner.resolver';
import { WorkerRunnerResolver } from './worker-runner.resolver';

export class RunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolver<R> {
    private workerRunnerResolver: WorkerRunnerResolver<R>;

    constructor(config: INodeRunnerResolverConfigBase<R>) {
        super(config);
        this.workerRunnerResolver = new WorkerRunnerResolver(config);
    }

    public runInWorker(): void {
        this.workerRunnerResolver.run();
    }
}
