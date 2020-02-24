import { IRunnerError, NodeResolverAction, RunnerConstructor, RunnerErrorCode, RunnerErrorMessages } from '@worker-runner/core';
import { RxNodeRunnerResolver } from './node-runner.resolver';
import { RxWorkerRunnerResolver } from './worker-runner.resolver';

export class RxLocalRunnerResolver<R extends RunnerConstructor> extends RxNodeRunnerResolver<R> {

    private localWorkerRunnerResolver?: RxWorkerRunnerResolver<R>;
    protected sendAction: typeof RxNodeRunnerResolver.prototype['sendAction'] = this.sendActionWithError;

    protected async initWorker(): Promise<void> {
        this.localWorkerRunnerResolver = new RxWorkerRunnerResolver(this.config);
        this.sendAction = this.localWorkerRunnerResolver.handleAction.bind(this.localWorkerRunnerResolver);
        this.localWorkerRunnerResolver.sendAction = this.handleWorkerAction.bind(this);
    }

    public async destroy(force = false): Promise<void> {
        if (this.localWorkerRunnerResolver) {
            const destroyPromise$ = new Promise<void>((resolve, reject) => {
                this.destroyPromise = {resolve, reject};
            });
            this.sendAction({ type: NodeResolverAction.DESTROY, force});
            await destroyPromise$;
            this.destroyRunnerControllers();
            this.localWorkerRunnerResolver.sendAction = () => {
                // stub
            };
            this.sendAction = this.sendActionWithError;
            this.localWorkerRunnerResolver = undefined;
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
