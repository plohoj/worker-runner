import { HostRunnerResolverBase, RunnerIdentifierConfigList, AvailableRunnersFromList, IRunnerEnvironmentConfig } from '@worker-runner/core';
import { RxWorkerRunnerErrorSerializer, RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RxRunnerEnvironment } from '../../runners/environment/runner.environment';

export class RxHostRunnerResolver<L extends RunnerIdentifierConfigList> extends HostRunnerResolverBase<L> {

    declare protected runnerEnvironments: Set<RxRunnerEnvironment<AvailableRunnersFromList<L>>>;

    protected override buildRunnerEnvironment(
        config: IRunnerEnvironmentConfig
    ): RxRunnerEnvironment<AvailableRunnersFromList<L>> {
        return new RxRunnerEnvironment(config);
    }

    protected override buildWorkerErrorSerializer(): RxWorkerRunnerErrorSerializer {
        return RX_WORKER_RUNNER_ERROR_SERIALIZER;
    }
}
