import { AnyRunnerFromList, ClientRunnerResolverBase, IRunnerControllerConfig, RunnerByIdentifier, RunnerConstructor, RunnerIdentifier, RunnersList } from '@worker-runner/core';
import { RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RxRunnerController } from '../runners/controller/runner.controller';
import { IRxRunnerSerializedParameter, RxResolvedRunner, RxResolvedRunnerArguments } from '../runners/resolved-runner';

type RxRunnerArguments<R extends RunnerConstructor>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    = R extends RunnerConstructor<any, infer A>
        ? A extends ArrayLike<IRxRunnerSerializedParameter>
            ? RxResolvedRunnerArguments<A>
            : never
        : never;

export class RxClientRunnerResolver<L extends RunnersList> extends ClientRunnerResolverBase<L> {

    declare public resolve: <I extends RunnerIdentifier<L>>(
        identifier: I,
        ...args: RxRunnerArguments<RunnerByIdentifier<L, I>>
    ) => Promise<RxResolvedRunner<InstanceType<RunnerByIdentifier<L, I>>>>;

    protected readonly errorSerializer = RX_WORKER_RUNNER_ERROR_SERIALIZER;

    protected runnerControllerFactory(
        config: IRunnerControllerConfig<AnyRunnerFromList<L>>
    ): RxRunnerController<AnyRunnerFromList<L>> {
        return new RxRunnerController(config);
    }
}
