import { INodeRunnerResolverConfigBase, RunnerConstructor } from '@worker-runner/core';
import { IRxRunnerBridgeConstructor, RxNodeRunnerResolver } from './node-runner.resolver';
import { RxWorkerRunnerResolver } from './worker-runner.resolver';

export class RxRunnerResolver<R extends RunnerConstructor> {
    private nodeRunnerResolver: RxNodeRunnerResolver<R>;
    private workerRunnerResolver: RxWorkerRunnerResolver<R>;

    constructor(config: INodeRunnerResolverConfigBase<R>) {
        this.nodeRunnerResolver = new RxNodeRunnerResolver(config);
        this.workerRunnerResolver = new RxWorkerRunnerResolver(config);
    }

    public run(): Promise<void> {
        return this.nodeRunnerResolver.run();
    }

    public resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>
    ): Promise<InstanceType<IRxRunnerBridgeConstructor<RR>>> {
        return this.nodeRunnerResolver.resolve(runner, ...args);
    }

    public destroy(force = false): Promise<void> {
        return this.nodeRunnerResolver.destroy(force);
    }

    public runInWorker(): void {
        this.workerRunnerResolver.run();
    }
}
