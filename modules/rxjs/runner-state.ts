import { INodeDestroyAction, INodeExecuteAction } from '@core/actions/node.actions';
import { extractError } from '@core/errors/extract-error';
import { WorkerRunnerState } from '@core/state/worker-runner.state';
import { RunnerConstructor } from '@core/types/constructor';
import { JsonObject } from '@core/types/json-object';
import { Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/Operators';
import { IRxNodeSubscribeAction, IRxNodeUnsubscribeAction, RxNodeAction } from './actions/node.actions';
import { IRxWorkerAction, RxWorkerAction } from './actions/worker.actions';
import { RxRunnerErrorCode, RxRunnerErrorMessages } from './runners-errors';

interface IRxSubscribeInfo {
    actionId: number;
    instanceId: number;
}

export class RxWorkerRunnerState<R extends RunnerConstructor> extends WorkerRunnerState<R> {
    /** { actionId: Observable } */
    private observableList = new Map<number, Observable<JsonObject>>();
    /** Event for stop listening the Observable */
    private unsubscribe$ = new Subject<IRxSubscribeInfo | 'ALL'>();

    protected declare sendAction: (action: IRxWorkerAction) => void;

    protected async handleExecuteResponse(
        action: INodeExecuteAction,
        response: JsonObject | Observable<JsonObject>,
    ): Promise<void> {
        if (response instanceof Observable) {
            this.observableList.set(action.actionId, response);
            this.sendAction({
                type: RxWorkerAction.RUNNER_RX_INIT,
                actionId: action.actionId,
                instanceId: action.instanceId,
            });
        } else {
            await super.handleExecuteResponse(action, response);
        }
    }

    public async execute(action: INodeExecuteAction | IRxNodeSubscribeAction | IRxNodeUnsubscribeAction,
    ): Promise<void> {
        switch (action.type) {
            case RxNodeAction.RX_SUBSCRIBE:
                this.observeResponse(action);
                break;
            case RxNodeAction.RX_UNSUBSCRIBE:
                this.unsubscribe$.next(action);
                break;
            default:
                return super.execute(action);
        }
    }

    private observeResponse(action: IRxNodeSubscribeAction): void {
        const observable = this.observableList.get(action.actionId);
        this.observableList.delete(action.actionId);
        if (!observable) {
            const error = new Error(RxRunnerErrorMessages.SUBSCRIPTION_NOT_FOUND);
            this.sendAction({
                type: RxWorkerAction.RUNNER_RX_ERROR,
                actionId: action.actionId,
                instanceId: action.instanceId,
                error: RxRunnerErrorMessages.SUBSCRIPTION_NOT_FOUND,
                stacktrace: error.stack,
                errorCode: RxRunnerErrorCode.SUBSCRIPTION_NOT_FOUND,
            });
            this.sendAction({
                type: RxWorkerAction.RUNNER_RX_COMPLETED,
                actionId: action.actionId,
                instanceId: action.instanceId,
            });
            return;
        }
        observable.pipe(
            takeUntil(this.unsubscribe$.pipe(
                filter(info => {
                    if (info === 'ALL') {
                        return true;
                    }
                    return info.instanceId === action.actionId && info.actionId === action.actionId;
                }),
            )),
        ).subscribe(
            (rxResponse) => this.sendAction({
                type: RxWorkerAction.RUNNER_RX_EMIT,
                actionId: action.actionId,
                instanceId: action.instanceId,
                response: rxResponse,
            }),
            (error) => this.sendAction({
                type: RxWorkerAction.RUNNER_RX_ERROR,
                actionId: action.actionId,
                instanceId: action.instanceId,
                ...extractError(error),
                errorCode: RxRunnerErrorCode.ERROR_EMIT,
            }),
            () => {
                this.sendAction({
                    type: RxWorkerAction.RUNNER_RX_COMPLETED,
                    actionId: action.actionId,
                    instanceId: action.instanceId,
                });
            },
        );
    }

    public async destroy(action?: INodeDestroyAction): Promise<void> {
        this.unsubscribe$.next('ALL');
        super.destroy(action);
    }
}
