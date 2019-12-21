import { INodeAction } from '@core/actions/node.actions';
import { IWorkerAction, WorkerAction } from '@core/actions/worker.actions';
import { JsonObject } from '@core/types/json-object';
import { WorkerBridge } from '@core/worker-bridge/worker-bridge';
import { Observable, Subscriber } from 'rxjs';
import { IRxNodeAction, RxNodeAction } from './actions/node.actions';
import { IRxWorkerAction, RxWorkerAction } from './actions/worker.actions';
import { RxRunnerErrorMessages } from './runners-errors';

export class RxWorkerBridge extends WorkerBridge {

    private subscribers$ = new Map<number, Subscriber<JsonObject>>();

    protected declare sendAction: (action: INodeAction | IRxNodeAction) => void;

    protected handleWorkerAction(action: IRxWorkerAction): void {
        switch (action.type) {
            case RxWorkerAction.RUNNER_RX_INIT:
                const observable = new Observable<JsonObject>(subscriber => {
                    this.subscribers$.set(action.actionId, subscriber);
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
                break;
            case RxWorkerAction.RUNNER_RX_EMIT:
                const emitSubscriber$ = this.subscribers$.get(action.actionId);
                if (!emitSubscriber$) {
                    console.error(new Error(RxRunnerErrorMessages.SUBSCRIBER_NOT_FOUND));
                    return;
                }
                emitSubscriber$.next(action.response);
                break;
            case RxWorkerAction.RUNNER_RX_ERROR:
                const errorSubscriber$ = this.subscribers$.get(action.actionId);
                if (!errorSubscriber$) {
                    console.error(new Error(RxRunnerErrorMessages.SUBSCRIBER_NOT_FOUND));
                    return;
                }
                errorSubscriber$.error(action.error);
                break;
            case RxWorkerAction.RUNNER_RX_COMPLETED:
                const completedSubscriber$ = this.subscribers$.get(action.actionId);
                if (!completedSubscriber$) {
                    console.error(new Error(RxRunnerErrorMessages.SUBSCRIBER_NOT_FOUND));
                    return;
                }
                completedSubscriber$.complete();
                break;
            default:
                super.handleWorkerAction(action as IWorkerAction);
                break;
        }
    }
}
