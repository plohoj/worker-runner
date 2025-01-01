import { RunnerResolverClientBase, ResolvedRunner, ResolvedRunnerArguments, RunnerConstructor, RunnerIdentifierConfigList, RunnerByAnyIdentifier, InstanceTypeOrUnknown, AvailableRunnerIdentifier } from '@worker-runner/core';

export type RunnerArguments<R extends RunnerConstructor>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    = R extends RunnerConstructor<any, infer A>
        ? ResolvedRunnerArguments<A>
        : unknown[];

export class RunnerResolverClient<L extends RunnerIdentifierConfigList = []> extends RunnerResolverClientBase<L> {

    declare public resolve: <I extends AvailableRunnerIdentifier<L>>(
        identifier: I,
        ...args: RunnerArguments<RunnerByAnyIdentifier<L, I>>
    ) => Promise<ResolvedRunner<InstanceTypeOrUnknown<RunnerByAnyIdentifier<L, I>>>>;
}
