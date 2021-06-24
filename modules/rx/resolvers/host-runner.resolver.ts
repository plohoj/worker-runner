import { IRunnerControllerConfig, HostRunnerResolverBase, StrictRunnersList, AvailableRunnersFromList, IRunnerEnvironmentConfig } from '@worker-runner/core';
import { RxWorkerRunnerErrorSerializer, RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RxRunnerController } from '../runners/controller/runner.controller';
import { RxRunnerEnvironment } from '../runners/environment/runner.environment';

export class RxHostRunnerResolver<L extends StrictRunnersList> extends HostRunnerResolverBase<L> {

    declare protected runnerEnvironments: Set<RxRunnerEnvironment<AvailableRunnersFromList<L>>>;

    protected buildRunnerEnvironment(
        config: IRunnerEnvironmentConfig<AvailableRunnersFromList<L>>
    ): RxRunnerEnvironment<AvailableRunnersFromList<L>> {
        return new RxRunnerEnvironment(config);
    }

    protected buildWorkerErrorSerializer(): RxWorkerRunnerErrorSerializer {
        return RX_WORKER_RUNNER_ERROR_SERIALIZER;
    }

    protected buildRunnerController(
        config: IRunnerControllerConfig<AvailableRunnersFromList<L>>,
    ): RxRunnerController<AvailableRunnersFromList<L>> {
        return new RxRunnerController(config);
    }
}
