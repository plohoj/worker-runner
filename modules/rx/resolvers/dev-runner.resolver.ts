import { NodeResolverAction, RunnerConstructor } from '@worker-runner/core';
import { RxNodeRunnerResolver } from './node-runner.resolver';
import { RxWorkerRunnerResolver } from './worker-runner.resolver';

export class RxDevRunnerResolver<R extends RunnerConstructor> extends RxNodeRunnerResolver<R> {

    protected async initWorker(): Promise<void> {
        const devWorkerRunnerResolver = new RxWorkerRunnerResolver(this.config);
        this.sendAction = devWorkerRunnerResolver.handleAction.bind(devWorkerRunnerResolver);
        devWorkerRunnerResolver.sendAction = this.handleWorkerAction.bind(this);
    }

    public async destroy(force = false): Promise<void> {
        const destroyPromise$ = new Promise<void>((resolve, reject) => {
            this.destroyPromise = {resolve, reject};
        });
        this.sendAction({ type: NodeResolverAction.DESTROY, force });
        await destroyPromise$;
        this.destroyRunnerControllers();
    }
}
