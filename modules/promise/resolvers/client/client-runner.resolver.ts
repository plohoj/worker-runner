import { IRunnerSerializedParameter, ClientRunnerResolverBase, ResolvedRunner, ResolvedRunnerArguments, RunnerConstructor, SoftRunnersList, RunnerIdentifier, SoftRunnerByIdentifier } from '@worker-runner/core';

// TODO Extract?
export type RunnerArguments<R extends RunnerConstructor>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    = R extends RunnerConstructor<any, infer A>
        ? A extends ArrayLike<IRunnerSerializedParameter>
            ? ResolvedRunnerArguments<A>
            : never
        : never;

export class ClientRunnerResolver<L extends SoftRunnersList> extends ClientRunnerResolverBase<L> {

    declare public resolve: <I extends RunnerIdentifier>(
        identifier: I,
        ...args: RunnerArguments<SoftRunnerByIdentifier<L, I>>
    ) => Promise<ResolvedRunner<InstanceType<SoftRunnerByIdentifier<L, I>>>>;
}
