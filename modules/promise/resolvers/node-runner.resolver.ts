import { IRunnerParameter, NodeAndLocalRunnerResolverBase, ResolveRunner, ResolveRunnerArguments, RunnerConstructor } from '@worker-runner/core';

export class NodeRunnerResolver<R extends RunnerConstructor> extends NodeAndLocalRunnerResolverBase<R> {
    declare public resolve: <RR extends R>(
        runner: RR,
        ...args: RR extends new (...args: infer A) => any ?
            A extends Array<IRunnerParameter> ? ResolveRunnerArguments<A> : never : never
    ) => Promise<ResolveRunner<InstanceType<RR>>>;
}
