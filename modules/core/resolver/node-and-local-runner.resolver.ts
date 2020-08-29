import { NodeResolverAction, RunnerConstructor } from '@worker-runner/core';
import { INodeResolverAction } from '../actions/node-resolver.actions';
import { WorkerNotInitError } from '../errors/runner-errors';
import { RunnerBridge } from '../runner/runner-bridge';
import { Constructor } from '../types/constructor';
import { IRunnerResolverConfigBase } from './base-runner.resolver';
import { NodeRunnerResolverBase } from './node-runner.resolver';
import { WorkerRunnerResolverBase } from './worker-runner.resolver';

export abstract class NodeAndLocalRunnerResolverBase<R extends RunnerConstructor> extends NodeRunnerResolverBase<R> {

    protected WorkerResolverConstructor?: Constructor<WorkerRunnerResolverBase<R>,
        [Readonly<IRunnerResolverConfigBase<R>>]>;
    private localWorkerRunnerResolver?: WorkerRunnerResolverBase<R>;
    private localMessageChanel?: MessageChannel;

    public async destroy(force = false): Promise<void> {
        if (this.WorkerResolverConstructor) {
            if (this.localWorkerRunnerResolver) {
                const destroyPromise$ = new Promise<void>((resolve, reject) => {
                    this.destroyPromise = {resolve, reject};
                });
                this.sendAction({ type: NodeResolverAction.DESTROY, force});
                await destroyPromise$;
                this.destroyRunnerControllers();
                this.localWorkerRunnerResolver.sendAction = undefined as any;
                if (this.localMessageChanel) {
                    this.localMessageChanel.port2.onmessage = undefined as any;
                    this.localMessageChanel.port1.onmessage = undefined as any;
                    this.localMessageChanel = undefined;
                }
                this.localWorkerRunnerResolver = undefined;
            } else {
                throw new WorkerNotInitError();
            }
        } else {
            return super.destroy(force);
        }
    }

    protected async initWorker(): Promise<void> {
        if (this.WorkerResolverConstructor) {
            this.localWorkerRunnerResolver = new this.WorkerResolverConstructor({runners: this.runners});
            this.localMessageChanel = new MessageChannel();
            this.localMessageChanel.port1.onmessage = this.onWorkerMessage.bind(this);
            this.localWorkerRunnerResolver.sendAction
                = this.localMessageChanel.port2.postMessage.bind(this.localMessageChanel.port2);
            this.localMessageChanel.port2.onmessage
                = this.localWorkerRunnerResolver.onMessage.bind(this.localWorkerRunnerResolver);
        } else {
            return super.initWorker();
        }
    }

    protected sendAction(
        action: INodeResolverAction,
        transfer?: Transferable[],
    ): void {
        if (this.WorkerResolverConstructor) {
            if (this.localMessageChanel) {
                this.localMessageChanel.port1.postMessage(action, transfer as Transferable[]);
            } else {
                throw new WorkerNotInitError();
            }
        } else {
            super.sendAction(action, transfer);
        }
    }
    /**
     * Wraps the Runner and returns a Runner control object that will call the methods of the original Runner instance.
     * The original Runner instance will be executed in the same area in which it was wrapped.
     */
    protected wrapRunner(runnerInstance: InstanceType<R>): RunnerBridge {
        if (!this.localWorkerRunnerResolver) {
            throw new WorkerNotInitError();
        }
        const runnerId = this.getRunnerId(Object.getPrototypeOf(runnerInstance).constructor);
        const port = this.localWorkerRunnerResolver.wrapRunner(runnerInstance);
        const controller = this.buildRunnerController(runnerId, port);
        return controller.resolvedRunner;
    }
}
