import { ClientRunnerResolverBase, Constructor, RunnerConstructor, RunnerIdentifierConfigList, RunnerIdentifier, RunnerByIdentifier, InstanceTypeOrUnknown, IRunnerEnvironmentClientCollectionConfig } from '@worker-runner/core';
import { RxWorkerRunnerErrorSerializer, RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RxRunnerEnvironmentClientCollection } from '../runner-environment/client/runner-environment.client.collection';
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

    protected override buildRunnerEnvironmentClientCollection(
        config: IRunnerEnvironmentClientCollectionConfig<L>
    ): RxRunnerEnvironmentClientCollection<L> {
        return new RxRunnerEnvironmentClientCollection(config);
    }

    protected override buildErrorSerializer(): RxWorkerRunnerErrorSerializer {
        return RX_WORKER_RUNNER_ERROR_SERIALIZER;
    }
}
