import { NodeResolverAction, RunnerConstructor } from '@worker-runner/core';
import { NodeRunnerResolver } from './node-runner.resolver';
import { WorkerRunnerResolver } from './worker-runner.resolver';

export class DevRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolver<R> {

    protected async initWorker(): Promise<void> {
        const devWorkerRunnerResolver = new WorkerRunnerResolver(this.config);
        this.sendAction = devWorkerRunnerResolver.handleAction.bind(devWorkerRunnerResolver);
        devWorkerRunnerResolver.sendAction = this.handleWorkerAction.bind(this);
    }

    public async destroy(force = false): Promise<void> {
        const destroyPromise$ = new Promise<void>((resolve, reject) => {
            this.destroyPromise = {resolve, reject};
        });
        this.sendAction({ type: NodeResolverAction.DESTROY, force});
        await destroyPromise$;
        this.destroyRunnerControllers();
    }
}
