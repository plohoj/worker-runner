import { IRunnerControllerConfig, RunnerConstructor, WorkerRunnerResolverBase } from '@worker-runner/core';
import { RxWorkerRunnerErrorSerializer, RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RxRunnerController } from '../runners/controller/runner.controller';
import { RxRunnerEnvironment } from '../runners/environment/runner.environment';

export class RxWorkerRunnerResolver<R extends RunnerConstructor> extends WorkerRunnerResolverBase<R> {

    declare protected runnerEnvironments: Set<RxRunnerEnvironment<R>>;
    protected readonly RunnerEnvironmentConstructor = RxRunnerEnvironment;

    protected buildWorkerErrorSerializer(): RxWorkerRunnerErrorSerializer {
        return RX_WORKER_RUNNER_ERROR_SERIALIZER;
    }

    protected runnerControllerFactory(config: IRunnerControllerConfig<R>): RxRunnerController<R> {
        return new RxRunnerController(config);
    }
}
