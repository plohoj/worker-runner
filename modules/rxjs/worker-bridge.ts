import { INodeAction, INodeDestroyAction, INodeExecuteAction, INodeInitAction, INodeWorkerDestroyAction, NodeAction } from '@core/actions/node.actions';
import { IWorkerAction, IWorkerDestroyedAction, IWorkerRunnerDestroyedAction, IWorkerRunnerExecutedAction, IWorkerRunnerInitAction, WorkerAction } from '@core/actions/worker.actions';
import { JsonObject } from '@core/types/json-object';
import { WorkerBridge } from '@core/worker-bridge/worker-bridge';
import { Observable, Subscriber } from 'rxjs';
import { IRxNodeAction, RxNodeAction } from './actions/node.actions';
import { IRxWorkerAction, RxWorkerAction } from './actions/worker.actions';
import { IRxRunnerError, RxRunnerErrorCode, RxRunnerErrorMessages } from './runners-errors';

export class RxWorkerBridge extends WorkerBridge {

    /** If value is undefined then Runner was destroyed */
    private subscribers$?: Map<number, Subscriber<JsonObject>> = new Map();

    protected declare sendAction: (action: INodeAction | IRxNodeAction) => void;

    protected handleWorkerAction(action: IRxWorkerAction): void {
        switch (action.type) {
            case RxWorkerAction.RUNNER_RX_INIT:
                const observable = new Observable<JsonObject>(subscriber => {
                    if (this.subscribers$) {
                        this.subscribers$.set(action.actionId, subscriber);
                        this.sendAction({
                            type: RxNodeAction.RX_SUBSCRIBE,
                            actionId: action.actionId,
                            instanceId: action.instanceId,
                        });
                    } else {
                        subscriber.error({
                            error: new Error(RxRunnerErrorMessages.RUNNER_WAS_DESTROYED),
                            errorCode: RxRunnerErrorCode.RUNNER_WAS_DESTROYED,
                            message: RxRunnerErrorMessages.RUNNER_WAS_DESTROYED,
                        } as IRxRunnerError);
                        subscriber.complete();
                    }
                });
                super.handleWorkerAction({
                    ...action,
                    type: WorkerAction.RUNNER_EXECUTED,
                    response: observable as any,
                });
                break;
            case RxWorkerAction.RUNNER_RX_EMIT:
                const emitSubscriber$ = this.subscribers$?.get(action.actionId);
                debugger;
                if (!emitSubscriber$) {
                    console.error(new Error(RxRunnerErrorMessages.SUBSCRIBER_NOT_FOUND));
                    return;
                }
                emitSubscriber$.next(action.response);
                break;
            case RxWorkerAction.RUNNER_RX_ERROR:
                const errorSubscriber$ = this.subscribers$?.get(action.actionId);
                if (!errorSubscriber$) {
                    console.error(new Error(RxRunnerErrorMessages.SUBSCRIBER_NOT_FOUND));
                    return;
                }
                errorSubscriber$.error(action.error);
                break;
            case RxWorkerAction.RUNNER_RX_COMPLETED:
                const completedSubscriber$ = this.subscribers$?.get(action.actionId);
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

    public async execute(action: INodeInitAction): Promise<IWorkerRunnerInitAction>;
    public async execute(action: INodeExecuteAction): Promise<IWorkerRunnerExecutedAction>;
    public async execute(action: INodeDestroyAction): Promise<IWorkerRunnerDestroyedAction>;
    public async execute(action: INodeWorkerDestroyAction): Promise<IWorkerDestroyedAction>;
    public async execute(action: INodeAction): Promise<IRxWorkerAction>;
    public async execute(action: INodeAction): Promise<IRxWorkerAction> {
        if (action.type === NodeAction.DESTROY) {
            this.subscribers$?.forEach(subscriber => {
                subscriber.error({
                    error: new Error(RxRunnerErrorMessages.RUNNER_WAS_DESTROYED),
                    message: RxRunnerErrorMessages.RUNNER_WAS_DESTROYED,
                    errorCode: RxRunnerErrorCode.RUNNER_WAS_DESTROYED,
                } as IRxRunnerError);
                subscriber.complete();
            });
            this.subscribers$ = undefined;
        }
        return super.execute(action);
    }
}
