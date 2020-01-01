import { Constructor, INodeAction, IRunnerError, IWorkerAction, JsonObject, NodeRunnerResolverBase, RunnerBridge, RunnerConstructor, RunnerErrorCode, RunnerErrorMessages, WorkerAction } from '@worker-runner/core';
import { Observable, Subscriber } from 'rxjs';
import { IRxNodeAction, RxNodeAction } from '../actions/node.actions';
import { IRxWorkerAction, IRxWorkerRunnerCompletedAction, IRxWorkerRunnerEmitAction, IRxWorkerRunnerErrorAction, IRxWorkerRunnerInitAction, RxWorkerAction } from '../actions/worker.actions';
import { RxResolveRunner } from '../resolved-runner';
import { RxRunnerErrorMessages } from '../runners-errors';
import { RxNodeRunnerState } from '../states/node-runner.state';

export type IRxRunnerBridgeConstructor<T extends RunnerConstructor>
    = Constructor<RxResolveRunner<InstanceType<T>>, ConstructorParameters<typeof RunnerBridge>>;

export class RxNodeRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolverBase<R> {

    private executeHandler = this.execute.bind(this);

    protected declare runnerStates: Map<number, RxNodeRunnerState>;
    protected declare getRunnerState: (instanceId: number) => RxNodeRunnerState;
    protected declare sendAction: (action: INodeAction | IRxNodeAction) => void;

    public async resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>
    ): Promise<RxResolveRunner<InstanceType<RR>>> {
        const runnerId = this.config.runners.indexOf(runner);
        const instanceId = await this.sendInitAction(runnerId, args);
        return new (this.runnerBridgeConstructors[runnerId])(this.executeHandler, instanceId) as any;
    }

    protected handleWorkerAction(action: IRxWorkerAction): void {
            switch (action.type) {
                case RxWorkerAction.RUNNER_RX_INIT:
                    this.runnerObservableInit(action);
                    break;
                case RxWorkerAction.RUNNER_RX_EMIT:
                    this.runnerObservableEmit(action);
                    break;
                case RxWorkerAction.RUNNER_RX_ERROR:
                    this.runnerObservableError(action);
                    break;
                case RxWorkerAction.RUNNER_RX_COMPLETED:
                    this.runnerObservableCompleted(action);
                    break;
                default:
                    super.handleWorkerAction(action as IWorkerAction);
                    break;
            }
    }

    private runnerObservableInit(action: IRxWorkerRunnerInitAction): void {
        const observable = new Observable<JsonObject>(subscriber => {
            try {
                this.getRunnerState(action.instanceId).subscribers$.set(action.actionId, subscriber);
            } catch (error) {
                throw {
                    error,
                    errorCode: RunnerErrorCode.RUNNER_EXECUTE_INSTANCE_NOT_FOUND,
                    message: RunnerErrorMessages.INSTANCE_NOT_FOUND,
                } as IRunnerError;
            }
            this.sendAction({
                type: RxNodeAction.RX_SUBSCRIBE,
                actionId: action.actionId,
                instanceId: action.instanceId,
            });
        });
        super.handleWorkerAction({
            ...action,
            type: WorkerAction.RUNNER_EXECUTED,
            response: observable as any,
        });
    }

    private runnerObservableEmit(action: IRxWorkerRunnerEmitAction): void {
        this.getSubscriber(action.instanceId, action.actionId).next(action.response);
    }

    private runnerObservableError(action: IRxWorkerRunnerErrorAction): void {
        this.getSubscriber(action.instanceId, action.actionId).error(action.error);
    }

    private runnerObservableCompleted(action: IRxWorkerRunnerCompletedAction): void {
        this.getSubscriber(action.instanceId, action.actionId).complete();
        this.getRunnerState(action.instanceId).subscribers$.delete(action.actionId);
    }

    private getSubscriber(instanceId: number, actionId: number): Subscriber<JsonObject> {
        const completedSubscriber$ = this.getRunnerState(instanceId).subscribers$.get(actionId);
        if (!completedSubscriber$) {
            throw new Error(RxRunnerErrorMessages.SUBSCRIBER_NOT_FOUND);
        }
        return completedSubscriber$;
    }

    protected initRunnerState(instanceId: number): void {
        this.runnerStates.set(instanceId, new RxNodeRunnerState());
    }
}
