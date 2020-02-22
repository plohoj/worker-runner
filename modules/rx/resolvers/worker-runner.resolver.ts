import { RunnerConstructor, WorkerRunnerResolverBase } from '@worker-runner/core';
import { RxRunnerEnvironment } from '../runners/runner.environment';

export class RxWorkerRunnerResolver<R extends RunnerConstructor> extends WorkerRunnerResolverBase<R> {

    declare protected runnerEnvironments: Set<RxRunnerEnvironment<R>>;
    protected RunnerEnvironmentConstructor = RxRunnerEnvironment;

}
