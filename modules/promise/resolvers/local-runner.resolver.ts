import { ResolveRunner, RunnerConstructor } from '@worker-runner/core';
import { NodeRunnerResolver } from './node-runner.resolver';
import { WorkerRunnerResolver } from './worker-runner.resolver';

export class LocalRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolver<R> {
    declare public wrapRunner: <RR extends R>(runner: InstanceType<R>) => ResolveRunner<InstanceType<RR>>;
    protected WorkerResolverConstructor = WorkerRunnerResolver;
}
