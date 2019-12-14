import { INodeExecuteAction } from '@core/actions/node.actions';
import { RunnerState } from '@core/runner-state';
import { RunnerConstructor } from '@core/types/constructor';
import { JsonObject } from '@core/types/json-object';
import { Observable, pipe, Subject } from 'rxjs';
import { filter, switchMap, takeUntil } from 'rxjs/Operators';
import { IWorkerRxAction, RxWorkerAction } from './actions/worker.actions';

interface ISubscribeInfo {
    actionId: number;
    instanceId: number;
}

export class RxRunnerState<R extends RunnerConstructor> extends RunnerState<R> {
    /** { actionId: Observable } */
    private observableList = new Map<number, Observable<JsonObject>>();
    /** Event for stop listening the Observable */
    private unsubscribe$ = new Subject<ISubscribeInfo>();

    protected declare sendAction: (action: IWorkerRxAction) => void;

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

    private observeResponse(action: INodeExecuteAction, observable: Observable<JsonObject>): void {
        const filterAction = pipe(filter((info: ISubscribeInfo) =>
            info.instanceId === action.actionId && info.actionId === action.actionId));
        observable.pipe(
            takeUntil(this.unsubscribe$.pipe(filterAction)),
            switchMap(() => observable),
        ).subscribe(
            (rxResponse) => {
                // TODO
            },
        );
    }

}
