import { ResolvedRunner, RunnerConstructor } from '@worker-runner/core';
import { NodeRunnerResolver } from './node-runner.resolver';
import { WorkerRunnerResolver } from './worker-runner.resolver';

export class LocalRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolver<R> {
    declare public wrapRunner: <RR extends InstanceType<R>>(runnerInstance: RR) => ResolvedRunner<RR>;
    protected WorkerResolverConstructor = WorkerRunnerResolver;
}
