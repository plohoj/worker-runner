import { RunnerResolverClientBase, ResolvedRunner, ResolvedRunnerArguments, RunnerConstructor, RunnerIdentifierConfigList, RunnerByIdentifier, InstanceTypeOrUnknown, AvailableRunnerIdentifier } from '@worker-runner/core';

export type RunnerArguments<R extends RunnerConstructor>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    = R extends RunnerConstructor<any, infer A>
        ? ResolvedRunnerArguments<A>
        : never;

export class RunnerResolverClient<L extends RunnerIdentifierConfigList = []> extends RunnerResolverClientBase<L> {

    declare public resolve: <I extends AvailableRunnerIdentifier<L>>(
        identifier: I,
        ...args: RunnerArguments<RunnerByIdentifier<L, I>>
    ) => Promise<ResolvedRunner<InstanceTypeOrUnknown<RunnerByIdentifier<L, I>>>>;
}
