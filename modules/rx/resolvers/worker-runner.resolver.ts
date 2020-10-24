import { IRunnerControllerConfig, BaseWorkerRunnerResolver, RunnersList, AnyRunnerFromList } from '@worker-runner/core';
import { RxWorkerRunnerErrorSerializer, RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RxRunnerController } from '../runners/controller/runner.controller';
import { RxRunnerEnvironment } from '../runners/environment/runner.environment';

export class RxWorkerRunnerResolver<L extends RunnersList> extends BaseWorkerRunnerResolver<L> {

    declare protected runnerEnvironments: Set<RxRunnerEnvironment<AnyRunnerFromList<L>>>;
    protected readonly RunnerEnvironmentConstructor = RxRunnerEnvironment;

    protected buildWorkerErrorSerializer(): RxWorkerRunnerErrorSerializer {
        return RX_WORKER_RUNNER_ERROR_SERIALIZER;
    }

    protected runnerControllerFactory(
        config: IRunnerControllerConfig<AnyRunnerFromList<L>>,
    ): RxRunnerController<AnyRunnerFromList<L>> {
        return new RxRunnerController(config);
    }
}
