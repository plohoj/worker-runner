import { RunnerConstructor } from '@worker-runner/core';
import { RxNodeRunnerResolver } from '../resolvers/node-runner.resolver';
import { RxDevWorkerBridge } from './worker-bridge';
import { RxDevWorkerRunnerResolver } from './worker-runner.resolver';

export class RxDevRunnerResolver<R extends RunnerConstructor> extends RxNodeRunnerResolver<R> {

    protected async buildWorkerBridge(): Promise<RxDevWorkerBridge> {
        const workerResolve = new  RxDevWorkerRunnerResolver(this.config);
        return workerResolve.workerBridge;
    }
}
