import { IWorkerDestroyedAction, NodeAction, RunnerConstructor } from '@worker-runner/core';
import { NodeRunnerResolver } from '../resolvers/node-runner.resolver';
import { WorkerRunnerResolver } from '../resolvers/worker-runner.resolver';

export class DevRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolver<R> {

    protected async initWorker(): Promise<void> {
        const devWorkerRunnerResolver = new WorkerRunnerResolver(this.config);
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
