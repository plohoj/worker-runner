import { IRunnerSerializedParameter, ClientRunnerResolverBase, ResolvedRunner, ResolvedRunnerArguments, RunnerConstructor, RunnerIdentifierConfigList, RunnerIdentifier, RunnerByIdentifier, InstanceTypeOrUnknown } from '@worker-runner/core';

// TODO Extract?
export type RunnerArguments<R extends RunnerConstructor>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    = R extends RunnerConstructor<any, infer A>
        ? A extends ArrayLike<IRunnerSerializedParameter>
            ? ResolvedRunnerArguments<A>
            : never
        : never;

export class ClientRunnerResolver<L extends RunnerIdentifierConfigList = []> extends ClientRunnerResolverBase<L> {

    declare public resolve: <I extends RunnerIdentifier>(
        identifier: I,
        ...args: RunnerArguments<RunnerByIdentifier<L, I>>
    ) => Promise<ResolvedRunner<InstanceTypeOrUnknown<RunnerByIdentifier<L, I>>>>;
}
