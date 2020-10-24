import { IRunnerSerializedParameter, NodeRunnerResolverBase, ResolvedRunner, ResolvedRunnerArguments, RunnerByIdentifier, RunnerConstructor, RunnerIdentifier, RunnersList } from '@worker-runner/core';

type RunnerArguments<R extends RunnerConstructor>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    = R extends RunnerConstructor<any, infer A>
        ? A extends ArrayLike<IRunnerSerializedParameter>
            ? ResolvedRunnerArguments<A>
            : never
        : never;

export class NodeRunnerResolver<L extends RunnersList> extends NodeRunnerResolverBase<L> {

    declare public resolve: <I extends RunnerIdentifier<L>>(
        identifier: I,
        ...args: RunnerArguments<RunnerByIdentifier<L, I>>
    ) => Promise<ResolvedRunner<InstanceType<RunnerByIdentifier<L, I>>>>;
}
