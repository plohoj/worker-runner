import { INodeRunnerResolverConfigBase, RunnerConstructor } from '@worker-runner/core';
import { RxNodeRunnerResolver } from './node-runner.resolver';
import { RxWorkerRunnerResolver } from './worker-runner.resolver';

export class RxRunnerResolver<R extends RunnerConstructor> extends RxNodeRunnerResolver<R> {
    private workerRunnerResolver: RxWorkerRunnerResolver<R>;

    constructor(config: INodeRunnerResolverConfigBase<R>) {
        super(config);
        this.workerRunnerResolver = new RxWorkerRunnerResolver(config);
    }

    public runInWorker(): void {
        this.workerRunnerResolver.run();
    }
}
