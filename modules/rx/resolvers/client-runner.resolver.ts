import { ClientRunnerResolverBase, Constructor, RunnerConstructor, RunnerIdentifierConfigList, RunnerIdentifier, RunnerByIdentifier, InstanceTypeOrUnknown, IRunnerControllerCollectionConfig } from '@worker-runner/core';
import { RxWorkerRunnerErrorSerializer, RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RxRunnerControllerCollection } from '../runners/controller/runner.controller.collection';
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

    protected override buildRunnerControllerCollection(
        config: IRunnerControllerCollectionConfig<L>
    ): RxRunnerControllerCollection<L> {
        return new RxRunnerControllerCollection(config);
    }

    protected override buildErrorSerializer(): RxWorkerRunnerErrorSerializer {
        return RX_WORKER_RUNNER_ERROR_SERIALIZER;
    }
}
