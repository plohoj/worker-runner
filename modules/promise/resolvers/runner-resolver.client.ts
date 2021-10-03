import { IRunnerSerializedParameter, RunnerResolverClientBase, ResolvedRunner, ResolvedRunnerArguments, RunnerConstructor, RunnerIdentifierConfigList, RunnerIdentifier, RunnerByIdentifier, InstanceTypeOrUnknown } from '@worker-runner/core';

export type RunnerArguments<R extends RunnerConstructor>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    = R extends RunnerConstructor<any, infer A>
        ? A extends ArrayLike<IRunnerSerializedParameter>
            ? ResolvedRunnerArguments<A>
            : never
        : never;

export class RunnerResolverClient<L extends RunnerIdentifierConfigList = []> extends RunnerResolverClientBase<L> {

    declare public resolve: <I extends RunnerIdentifier>(
        identifier: I,
        ...args: RunnerArguments<RunnerByIdentifier<L, I>>
    ) => Promise<ResolvedRunner<InstanceTypeOrUnknown<RunnerByIdentifier<L, I>>>>;
}
