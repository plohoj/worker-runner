import { extractError, IRunnerControllerDestroyAction, IRunnerControllerExecuteAction, JsonObject, RunnerConstructor, RunnerEnvironment } from '@worker-runner/core';
import { Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { IRxRunnerControllerSubscribeAction, IRxRunnerControllerUnsubscribeAction, RxRunnerControllerAction } from '../actions/runner-controller.actions';
import { IRxRunnerEnvironmentAction, RxRunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { RxRunnerErrorCode, RxRunnerErrorMessages } from '../runners-errors';

export class RxRunnerEnvironment<R extends RunnerConstructor> extends RunnerEnvironment<R> {
    /** { actionId: Observable } */
    private observableList = new Map<number, Observable<JsonObject>>();
    /** Event for stop listening the Observable */
    private unsubscribe$ = new Subject<number | 'ALL'>();

    protected declare sendAction: (action: IRxRunnerEnvironmentAction) => void;

    protected async handleExecuteResponse(
        action: IRunnerControllerExecuteAction,
        response: JsonObject | Observable<JsonObject>,
    ): Promise<void> {
        if (response instanceof Observable) {
            this.observableList.set(action.id, response);
            this.sendAction({
                type: RxRunnerEnvironmentAction.RUNNER_RX_INIT,
                id: action.id,
            });
        } else {
            await super.handleExecuteResponse(action, response);
        }
    }

    public async handleAction(action: IRunnerControllerExecuteAction | IRunnerControllerDestroyAction
            | IRxRunnerControllerSubscribeAction | IRxRunnerControllerUnsubscribeAction,
    ): Promise<void> {
        switch (action.type) {
            case RxRunnerControllerAction.RX_SUBSCRIBE:
            case RxRunnerControllerAction.RX_UNSUBSCRIBE:
                this.execute(action);
                break;
            default:
                super.handleAction(action);
                break;
        }
    }

    public async execute(action: IRunnerControllerExecuteAction
        | IRxRunnerControllerSubscribeAction | IRxRunnerControllerUnsubscribeAction,
    ): Promise<void> {
        switch (action.type) {
            case RxRunnerControllerAction.RX_SUBSCRIBE:
                this.observeResponse(action);
                break;
            case RxRunnerControllerAction.RX_UNSUBSCRIBE:
                this.unsubscribe$.next(action.id);
                break;
            default:
                return super.execute(action);
        }
    }

    private observeResponse(action: IRxRunnerControllerSubscribeAction): void {
        const observable = this.observableList.get(action.id);
        this.observableList.delete(action.id);
        if (!observable) {
            const error = new Error(RxRunnerErrorMessages.SUBSCRIPTION_NOT_FOUND);
            this.sendAction({
                type: RxRunnerEnvironmentAction.RUNNER_RX_ERROR,
                id: action.id,
                error: RxRunnerErrorMessages.SUBSCRIPTION_NOT_FOUND,
                stacktrace: error.stack,
                errorCode: RxRunnerErrorCode.SUBSCRIPTION_NOT_FOUND,
            });
            this.sendAction({
                type: RxRunnerEnvironmentAction.RUNNER_RX_COMPLETED,
                id: action.id,
            });
            return;
        }
        observable.pipe(
            takeUntil(this.unsubscribe$.pipe(
                filter(actionId => {
                    if (actionId === 'ALL') {
                        return true;
                    }
                    return actionId === action.id;
                }),
            )),
        ).subscribe(
            (rxResponse) => this.sendAction({
                type: RxRunnerEnvironmentAction.RUNNER_RX_EMIT,
                id: action.id,
                response: rxResponse,
            }),
            (error) => this.sendAction({
                type: RxRunnerEnvironmentAction.RUNNER_RX_ERROR,
                id: action.id,
                ...extractError(error),
                errorCode: RxRunnerErrorCode.ERROR_EMIT,
            }),
            () => {
                this.sendAction({
                    type: RxRunnerEnvironmentAction.RUNNER_RX_COMPLETED,
                    id: action.id,
                });
            },
        );
    }

    public async destroy(action?: IRunnerControllerDestroyAction): Promise<void> {
        this.unsubscribe$.next('ALL');
        super.destroy(action);
    }
}
