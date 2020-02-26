import { RunnerConstructor } from '@worker-runner/core';
import { RxNodeRunnerResolver } from './node-runner.resolver';
import { RxWorkerRunnerResolver } from './worker-runner.resolver';

export class RxLocalRunnerResolver<R extends RunnerConstructor> extends RxNodeRunnerResolver<R> {
    protected workerResolverConstructor =  RxWorkerRunnerResolver;
}
