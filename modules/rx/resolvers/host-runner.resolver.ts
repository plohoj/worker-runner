import { IRunnerControllerConfig, HostRunnerResolverBase, RunnersList, AnyRunnerFromList, IRunnerEnvironmentConfig } from '@worker-runner/core';
import { RxWorkerRunnerErrorSerializer, RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RxRunnerController } from '../runners/controller/runner.controller';
import { RxRunnerEnvironment } from '../runners/environment/runner.environment';

export class RxHostRunnerResolver<L extends RunnersList> extends HostRunnerResolverBase<L> {

    declare protected runnerEnvironments: Set<RxRunnerEnvironment<AnyRunnerFromList<L>>>;

    protected buildRunnerResolver(
        config: IRunnerEnvironmentConfig<AnyRunnerFromList<L>>
    ): RxRunnerEnvironment<AnyRunnerFromList<L>> {
        return new RxRunnerEnvironment(config);
    }

    protected buildWorkerErrorSerializer(): RxWorkerRunnerErrorSerializer {
        return RX_WORKER_RUNNER_ERROR_SERIALIZER;
    }

    protected buildRunnerController(
        config: IRunnerControllerConfig<AnyRunnerFromList<L>>,
    ): RxRunnerController<AnyRunnerFromList<L>> {
        return new RxRunnerController(config);
    }
}
