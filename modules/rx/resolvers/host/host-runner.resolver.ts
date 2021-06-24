import { HostRunnerResolverBase, StrictRunnersList, AvailableRunnersFromList, IRunnerEnvironmentConfig, IArgumentsDeserializerConfig } from '@worker-runner/core';
import { RxWorkerRunnerErrorSerializer, RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RxRunnerEnvironment } from '../../runners/environment/runner.environment';
import { RxArgumentsDeserializer } from './arguments-deserializer';

export class RxHostRunnerResolver<L extends StrictRunnersList> extends HostRunnerResolverBase<L> {

    declare protected runnerEnvironments: Set<RxRunnerEnvironment<AvailableRunnersFromList<L>>>;

    protected override buildRunnerEnvironment(
        config: IRunnerEnvironmentConfig<AvailableRunnersFromList<L>>
    ): RxRunnerEnvironment<AvailableRunnersFromList<L>> {
        return new RxRunnerEnvironment(config);
    }

    protected override buildWorkerErrorSerializer(): RxWorkerRunnerErrorSerializer {
        return RX_WORKER_RUNNER_ERROR_SERIALIZER;
    }

    protected override buildArgumentsDeserializer(
        config: IArgumentsDeserializerConfig<L>
    ): RxArgumentsDeserializer<L> {
        return new RxArgumentsDeserializer<L>(config);
    }
}
