import { RunnerConstructor } from '@worker-runner/core';
import { RxResolveRunner } from '../resolved-runner';
import { RxNodeRunnerResolver } from './node-runner.resolver';
import { RxWorkerRunnerResolver } from './worker-runner.resolver';

export class RxLocalRunnerResolver<R extends RunnerConstructor> extends RxNodeRunnerResolver<R> {
    declare public wrapRunner: <RR extends R>(runner: InstanceType<R>) => RxResolveRunner<InstanceType<RR>>;
    protected WorkerResolverConstructor =  RxWorkerRunnerResolver;
}
