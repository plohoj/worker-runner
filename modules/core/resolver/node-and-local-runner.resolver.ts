import { IRunnerError, NodeResolverAction, RunnerConstructor, RunnerErrorCode, RunnerErrorMessages } from '@worker-runner/core';
import { INodeResolverWorkerDestroyAction } from '../actions/node-resolver.actions';
import { IRunnerControllerInitAction } from '../actions/runner-controller.actions';
import { Constructor } from '../types/constructor';
import { NodeRunnerResolverBase } from './node-runner.resolver';
import { WorkerRunnerResolverBase } from './worker-runner.resolver';

const stub = () => {
    // stub
};

export abstract class NodeAndLocalRunnerResolverBase<R extends RunnerConstructor> extends NodeRunnerResolverBase<R> {

    private localWorkerRunnerResolver?: WorkerRunnerResolverBase<R>;
    protected workerResolverConstructor?: Constructor<WorkerRunnerResolverBase<R>>;

    protected async initWorker(): Promise<void> {
        if (this.workerResolverConstructor) {
            this.localWorkerRunnerResolver = new this.workerResolverConstructor(this.config);
            this.localWorkerRunnerResolver.sendAction = this.handleWorkerAction.bind(this);
        } else {
            return super.initWorker();
        }
    }

    public async destroy(force = false): Promise<void> {
        if (this.workerResolverConstructor) {
            if (this.localWorkerRunnerResolver) {
                const destroyPromise$ = new Promise<void>((resolve, reject) => {
                    this.destroyPromise = {resolve, reject};
                });
                this.sendAction({ type: NodeResolverAction.DESTROY, force});
                await destroyPromise$;
                this.destroyRunnerControllers();
                this.localWorkerRunnerResolver.sendAction = stub;
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
        } else {
            return super.destroy(force);
        }
    }

    protected sendAction(
        action: INodeResolverWorkerDestroyAction | IRunnerControllerInitAction,
        transfer?: Transferable[],
    ): void {
        if (this.workerResolverConstructor) {
            if (this.localWorkerRunnerResolver) {
                this.localWorkerRunnerResolver.handleAction(action);
            } else {
                const error = new Error(RunnerErrorMessages.WORKER_NOT_INIT);
                throw {
                    errorCode: RunnerErrorCode.WORKER_NOT_INIT,
                    error,
                    message: RunnerErrorMessages.WORKER_NOT_INIT,
                    stacktrace: error.stack,
                } as IRunnerError;
            }
        } else {
            super.sendAction(action, transfer);
        }
    }
}
