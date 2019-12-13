import { INodeExecuteAction } from '@core/actions/node.actions';
import { WorkerRunnerResolverBase } from '@core/resolver/worker-runner.resolver';
import { Constructor } from '@core/types/constructor';
import { JsonObject } from '@core/types/json-object';
import { Observable, Subscription } from 'rxjs';
import { IRxWorkerAction, RxWorkerAction } from './actions/worker.actions';

export class WorkerRunnerResolver<R extends Constructor<{[key: string]: any}>> extends WorkerRunnerResolverBase<R> {
    /**
     * Subscription to running actions using Rx
     * { actionId: Subscription }
     */
    private actionSubscriptions = new Map<number, Subscription>();
    private actionObservable = new Map<number, Observable<JsonObject>>();
    protected handleExecuteResponse(
        action: INodeExecuteAction,
        response: JsonObject | Observable<JsonObject> | Promise<JsonObject>,
    ): void {
        if (response instanceof Observable) {
            // TODO don't subscribe right away
            this.actionSubscriptions.set(action.actionId, response.subscribe(
                (rxResponse) => {
                    this.sendAction({
                        type: RxWorkerAction.RUNNER_RX_INIT,
                        actionId: action.actionId,
                        instanceId: action.instanceId,
                        response: rxResponse,
                    });
                },
            ));
        }
        super.handleExecuteResponse(action, response);
        // TODO
    }

    public sendAction(action: IRxWorkerAction): void {
        super.sendAction(action as any);
    }
}
