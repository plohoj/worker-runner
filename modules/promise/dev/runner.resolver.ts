import { RunnerConstructor, WorkerBridge } from '@core';
import { NodeRunnerResolver } from '../resolvers/node-runner.resolver';
import { DevWorkerRunnerResolver } from './worker-runner.resolver';

export class DevRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolver<R> {

    protected async buildWorkerBridge(): Promise<WorkerBridge[]> {
        const workerResolve = new DevWorkerRunnerResolver(this.config);
        return [workerResolve.workerBridge];
    }
}
