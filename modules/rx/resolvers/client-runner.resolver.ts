import { AnyRunnerFromList, ClientRunnerResolverBase, Constructor, IRunnerControllerConfig, RunnerConstructor, SoftRunnersList, RunnerIdentifier, SoftRunnerByIdentifier, InstanceTypeOrUnknown } from '@worker-runner/core';
import { RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RxRunnerController } from '../runners/controller/runner.controller';
import { IRxRunnerSerializedParameter, RxResolvedRunner, RxResolvedRunnerArguments } from '../runners/resolved-runner';

export type RxRunnerArguments<R extends RunnerConstructor>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    = R extends Constructor<any, infer A>
        ? A extends ArrayLike<IRxRunnerSerializedParameter>
            ? RxResolvedRunnerArguments<A>
            : never
        : never;

export class RxClientRunnerResolver<L extends SoftRunnersList> extends ClientRunnerResolverBase<L> {

    declare public resolve: <I extends RunnerIdentifier>(
        identifier: I,
        ...args: RxRunnerArguments<SoftRunnerByIdentifier<L, I>>
    ) => Promise<RxResolvedRunner<InstanceTypeOrUnknown<SoftRunnerByIdentifier<L, I>>>>;

    protected override readonly errorSerializer = RX_WORKER_RUNNER_ERROR_SERIALIZER;

    protected override buildRunnerController(
        config: IRunnerControllerConfig<AnyRunnerFromList<L>>
    ): RxRunnerController<AnyRunnerFromList<L>> {
        return new RxRunnerController(config);
    }
}
