import { RunnerConstructor, WorkerRunnerResolverBase } from '@worker-runner/core';
import { RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error-serializer';
import { RxRunnerEnvironment } from '../runners/runner.environment';

export class RxWorkerRunnerResolver<R extends RunnerConstructor> extends WorkerRunnerResolverBase<R> {

    declare protected runnerEnvironments: Set<RxRunnerEnvironment<R>>;
    protected readonly RunnerEnvironmentConstructor = RxRunnerEnvironment;
    protected readonly errorSerializer = RX_WORKER_RUNNER_ERROR_SERIALIZER;
}
