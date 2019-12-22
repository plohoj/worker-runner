import { RunnerConstructor } from '@core/types/constructor';
import { WorkerBridge } from '@core/worker-bridge';
import { NodeRunnerResolver } from '../node-runner.resolver';
import { DevWorkerRunnerResolver } from './worker-runner.resolver';

export class DevRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolver<R> {

    protected async buildWorkerBridge(): Promise<WorkerBridge[]> {
        const workerResolve = new  DevWorkerRunnerResolver(this.config);
        return [workerResolve.workerBridge];
    }
}
