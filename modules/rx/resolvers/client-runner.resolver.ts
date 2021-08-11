import { AnyRunnerFromList, ClientRunnerResolverBase, Constructor, IRunnerControllerConfig, RunnerConstructor, RunnerIdentifierConfigList, RunnerIdentifier, RunnerByIdentifier, InstanceTypeOrUnknown } from '@worker-runner/core';
import { RxWorkerRunnerErrorSerializer, RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RxRunnerController } from '../runners/controller/runner.controller';
import { IRxRunnerSerializedParameter, RxResolvedRunner, RxResolvedRunnerArguments } from '../runners/resolved-runner';

export type RxRunnerArguments<R extends RunnerConstructor>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    = R extends Constructor<any, infer A>
        ? A extends ArrayLike<IRxRunnerSerializedParameter>
            ? RxResolvedRunnerArguments<A>
            : never
        : never;

export class RxClientRunnerResolver<L extends RunnerIdentifierConfigList = []> extends ClientRunnerResolverBase<L> {

    declare public resolve: <I extends RunnerIdentifier>(
        identifier: I,
        ...args: RxRunnerArguments<RunnerByIdentifier<L, I>>
    ) => Promise<RxResolvedRunner<InstanceTypeOrUnknown<RunnerByIdentifier<L, I>>>>;

    protected override buildRunnerController(
        config: IRunnerControllerConfig<AnyRunnerFromList<L>>
    ): RxRunnerController<AnyRunnerFromList<L>> {
        return new RxRunnerController(config);
    }

    protected override buildErrorSerializer(): RxWorkerRunnerErrorSerializer {
        return RX_WORKER_RUNNER_ERROR_SERIALIZER;
    }
}
