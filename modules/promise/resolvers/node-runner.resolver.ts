import { IRunnerSerializedParameter, NodeAndLocalRunnerResolverBase, ResolvedRunner, ResolvedRunnerArguments, RunnerConstructor } from '@worker-runner/core';

export class NodeRunnerResolver<R extends RunnerConstructor> extends NodeAndLocalRunnerResolverBase<R> {
    declare public resolve: <RR extends R>(
        runner: RR,
        ...args: RR extends new (...args: infer A) => any ?
            A extends Array<IRunnerSerializedParameter> ? ResolvedRunnerArguments<A> : never : never
    ) => Promise<ResolvedRunner<InstanceType<RR>>>;
}
