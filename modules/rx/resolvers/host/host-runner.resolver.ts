import { HostRunnerResolverBase, RunnerIdentifierConfigList, AvailableRunnersFromList, IRunnerEnvironmentHostConfig } from '@worker-runner/core';
import { RxWorkerRunnerErrorSerializer, RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RxRunnerEnvironmentHost } from '../../runner-environment/host/runner-environment.host';

export class RxHostRunnerResolver<L extends RunnerIdentifierConfigList> extends HostRunnerResolverBase<L> {

    declare protected runnerEnvironmentHosts: Set<RxRunnerEnvironmentHost<AvailableRunnersFromList<L>>>;

    protected override buildRunnerEnvironmentHost(
        config: IRunnerEnvironmentHostConfig
    ): RxRunnerEnvironmentHost<AvailableRunnersFromList<L>> {
        return new RxRunnerEnvironmentHost(config);
    }

    protected override buildWorkerErrorSerializer(): RxWorkerRunnerErrorSerializer {
        return RX_WORKER_RUNNER_ERROR_SERIALIZER;
    }
}
