import { IWorkerDestroyedAction, NodeAction, RunnerConstructor } from '@worker-runner/core';
import { RxNodeRunnerResolver } from '../resolvers/node-runner.resolver';
import { RxWorkerRunnerResolver } from '../resolvers/worker-runner.resolver';

export class RxDevRunnerResolver<R extends RunnerConstructor> extends RxNodeRunnerResolver<R> {

    protected async initWorker(): Promise<void> {
        const devWorkerRunnerResolver = new RxWorkerRunnerResolver(this.config);
        this.sendAction = devWorkerRunnerResolver.handleAction.bind(devWorkerRunnerResolver);
        devWorkerRunnerResolver.sendAction = this.handleWorkerAction.bind(this);
    }

    public async destroy(force = false): Promise<IWorkerDestroyedAction> {
        const destroyResult: IWorkerDestroyedAction =
                await this.execute({type: NodeAction.DESTROY_WORKER, force});
        this.destroyRunnerState();
        return destroyResult;
    }
}
