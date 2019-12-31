import { INodeAction, IRunnerError, IWorkerAction, JsonObject, RunnerErrorCode, RunnerErrorMessages, WorkerAction, WorkerBridge } from '@worker-runner/core';
import { Observable, Subscriber } from 'rxjs';
import { IRxNodeAction, RxNodeAction } from './actions/node.actions';
import { IRxWorkerAction, IRxWorkerRunnerCompletedAction, IRxWorkerRunnerEmitAction, IRxWorkerRunnerErrorAction, IRxWorkerRunnerInitAction, RxWorkerAction } from './actions/worker.actions';
import { RxRunnerErrorMessages } from './runners-errors';
import { RxNodeRunnerState } from './states/node-runner.state';

export class RxWorkerBridge extends WorkerBridge {

    protected declare runnerStates: Map<number, RxNodeRunnerState>;
    protected declare getRunnerState: (instanceId: number) => RxNodeRunnerState;

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

    protected sendAction(action: INodeAction | IRxNodeAction): void {
        super.sendAction(action as INodeAction);
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
