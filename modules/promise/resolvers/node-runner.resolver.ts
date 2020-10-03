import { IRunnerSerializedParameter, NodeRunnerResolverBase, ResolvedRunner, ResolvedRunnerArguments, RunnerConstructor } from '@worker-runner/core';

export class NodeRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolverBase<R> {
    declare public resolve: <RR extends R>(
        runner: RR,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: RR extends new (...args: infer A) => any
            ? A extends Array<IRunnerSerializedParameter>
                ? ResolvedRunnerArguments<A>
                : never
            : never
    ) => Promise<ResolvedRunner<InstanceType<RR>>>;
}
