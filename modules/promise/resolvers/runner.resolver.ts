import { INodeRunnerResolverConfigBase, ResolveRunner, RunnerConstructor } from '@worker-runner/core';
import { NodeRunnerResolver } from './node-runner.resolver';
import { WorkerRunnerResolver } from './worker-runner.resolver';

export class RunnerResolver<R extends RunnerConstructor> {
    private nodeRunnerResolver: NodeRunnerResolver<R>;
    private workerRunnerResolver: WorkerRunnerResolver<R>;

    constructor(config: INodeRunnerResolverConfigBase<R>) {
        this.nodeRunnerResolver = new NodeRunnerResolver(config);
        this.workerRunnerResolver = new WorkerRunnerResolver(config);
    }

    public run(): Promise<void> {
        return this.nodeRunnerResolver.run();
    }

    public resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>
    ): Promise<ResolveRunner<InstanceType<RR>>> {
        return this.nodeRunnerResolver.resolve(runner, ...args);
    }

    public destroy(force = false): Promise<void> {
        return this.nodeRunnerResolver.destroy(force);
    }

    public runInWorker(): void {
        this.workerRunnerResolver.run();
    }
}
