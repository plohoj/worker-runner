import { IRunnerError, NodeResolverAction, RunnerConstructor, RunnerErrorCode, RunnerErrorMessages } from '@worker-runner/core';
import { NodeRunnerResolver } from './node-runner.resolver';
import { WorkerRunnerResolver } from './worker-runner.resolver';

export class DevRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolver<R> {

    private devWorkerRunnerResolver?: WorkerRunnerResolver<R>;
    protected sendAction: typeof NodeRunnerResolver.prototype['sendAction'] = this.sendActionWithError;

    protected async initWorker(): Promise<void> {
        this.devWorkerRunnerResolver = new WorkerRunnerResolver(this.config);
        this.sendAction = this.devWorkerRunnerResolver.handleAction.bind(this.devWorkerRunnerResolver);
        this.devWorkerRunnerResolver.sendAction = this.handleWorkerAction.bind(this);
    }

    public async destroy(force = false): Promise<void> {
        if (this.devWorkerRunnerResolver) {
            const destroyPromise$ = new Promise<void>((resolve, reject) => {
                this.destroyPromise = {resolve, reject};
            });
            this.sendAction({ type: NodeResolverAction.DESTROY, force});
            await destroyPromise$;
            this.destroyRunnerControllers();
            this.devWorkerRunnerResolver.sendAction = () => {
                // stub
            };
            this.sendAction = this.sendActionWithError;
            this.devWorkerRunnerResolver = undefined;
        } else {
            const error = new Error(RunnerErrorMessages.WORKER_NOT_INIT);
            throw {
                errorCode: RunnerErrorCode.WORKER_NOT_INIT,
                error,
                message: RunnerErrorMessages.WORKER_NOT_INIT,
                stacktrace: error.stack,
            } as IRunnerError;
        }
    }

    private sendActionWithError(): void {
        const error = new Error(RunnerErrorMessages.WORKER_NOT_INIT);
        throw {
            errorCode: RunnerErrorCode.WORKER_NOT_INIT,
            error,
            message: RunnerErrorMessages.WORKER_NOT_INIT,
            stacktrace: error.stack,
        } as IRunnerError;
    }
}
