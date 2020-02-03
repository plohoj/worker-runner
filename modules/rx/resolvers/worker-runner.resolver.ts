import { IRunnerControllerInitAction, RunnerConstructor, WorkerRunnerResolverBase } from '@worker-runner/core';
import { RxRunnerEnvironment } from '../runners/runner.environment';

export class RxWorkerRunnerResolver<R extends RunnerConstructor> extends WorkerRunnerResolverBase<R> {

    declare protected runnerEnvironments: Set<RxRunnerEnvironment<R>>;

    protected buildRunnerEnvironment(
        action: IRunnerControllerInitAction,
        port: MessagePort,
        runnerConstructor: R,
    ): RxRunnerEnvironment<R> {
        const runnerEnvironment: RxRunnerEnvironment<R> = new RxRunnerEnvironment({
            port,
            runnerConstructor,
            runnerArguments: this.deserializeArguments(action.args),
            workerRunnerResolver: this,
            onDestroyed: () => this.runnerEnvironments.delete(runnerEnvironment),
        });
        return runnerEnvironment;
    }
}
