import { IRunnerSerializedParameter, ClientRunnerResolverBase, ResolvedRunner, ResolvedRunnerArguments, RunnerByIdentifier, RunnerConstructor, RunnerIdentifier, SoftRunnersList } from '@worker-runner/core';

type RunnerArguments<R extends RunnerConstructor>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    = R extends RunnerConstructor<any, infer A>
        ? A extends ArrayLike<IRunnerSerializedParameter>
            ? ResolvedRunnerArguments<A>
            : never
        : never;

export class ClientRunnerResolver<L extends SoftRunnersList> extends ClientRunnerResolverBase<L> {

    declare public resolve: <I extends RunnerIdentifier<L>>(
        identifier: I,
        ...args: RunnerArguments<RunnerByIdentifier<L, I>>
    ) => Promise<ResolvedRunner<InstanceType<RunnerByIdentifier<L, I>>>>;
}
