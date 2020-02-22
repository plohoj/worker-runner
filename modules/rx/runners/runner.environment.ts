import { extractError, IRunnerControllerAction, IRunnerControllerDestroyAction, IRunnerControllerExecuteAction, JsonObject, RunnerConstructor, RunnerControllerAction, RunnerEnvironment } from '@worker-runner/core';
import { Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { IRxRunnerControllerSubscribeAction, IRxRunnerControllerUnsubscribeAction, RxRunnerControllerAction } from '../actions/runner-controller.actions';
import { IRxRunnerEnvironmentAction, IRxRunnerEnvironmentCompletedAction, IRxRunnerEnvironmentEmitAction, IRxRunnerEnvironmentErrorAction, RxRunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { RxRunnerErrorCode, RxRunnerErrorMessages } from '../runners-errors';

export class RxRunnerEnvironment<R extends RunnerConstructor> extends RunnerEnvironment<R> {
    /** { actionId: Observable } */
    private observableList = new Map<number, Observable<JsonObject>>();
    /** Event for stop listening the Observable */
    private unsubscribe$ = new Subject<number | 'ALL'>();

    protected declare sendAction: (port: MessagePort, action: IRxRunnerEnvironmentAction) => void;

    protected async handleExecuteResponse(
        port: MessagePort,
        action: IRunnerControllerExecuteAction,
        response: JsonObject | Observable<JsonObject>,
    ): Promise<void> {
        if (response instanceof Observable) {
            this.observableList.set(action.id, response);
            this.sendAction(port , {
                type: RxRunnerEnvironmentAction.RUNNER_RX_INIT,
                id: action.id,
            });
        } else {
            await super.handleExecuteResponse(port, action, response);
        }
    }

    public async handleAction(
        port: MessagePort,
        action: IRunnerControllerAction<Exclude<RunnerControllerAction, RunnerControllerAction.INIT>>
            | IRxRunnerControllerSubscribeAction | IRxRunnerControllerUnsubscribeAction,
    ): Promise<void> {
        switch (action.type) {
            case RxRunnerControllerAction.RX_SUBSCRIBE:
            case RxRunnerControllerAction.RX_UNSUBSCRIBE:
                this.execute(port, action);
                break;
            default:
                super.handleAction(port, action);
                break;
        }
    }

    public async execute(
        port: MessagePort,
        action: IRunnerControllerExecuteAction
        | IRxRunnerControllerSubscribeAction | IRxRunnerControllerUnsubscribeAction,
    ): Promise<void> {
        switch (action.type) {
            case RxRunnerControllerAction.RX_SUBSCRIBE:
                this.observeResponse(port, action);
                break;
            case RxRunnerControllerAction.RX_UNSUBSCRIBE:
                this.unsubscribe$.next(action.id);
                break;
            default:
                return super.execute(port, action);
        }
    }

    private observeResponse(
        port: MessagePort,
        action: IRxRunnerControllerSubscribeAction,
    ): void {
        const observable = this.observableList.get(action.id);
        this.observableList.delete(action.id);
        if (!observable) {
            const error = new Error(RxRunnerErrorMessages.SUBSCRIPTION_NOT_FOUND);
            this.sendAction(port, {
                type: RxRunnerEnvironmentAction.RUNNER_RX_ERROR,
                id: action.id,
                error: RxRunnerErrorMessages.SUBSCRIPTION_NOT_FOUND,
                stacktrace: error.stack,
                errorCode: RxRunnerErrorCode.SUBSCRIPTION_NOT_FOUND,
            } as IRxRunnerEnvironmentErrorAction);
            this.sendAction(port, {
                type: RxRunnerEnvironmentAction.RUNNER_RX_COMPLETED,
                id: action.id,
            } as IRxRunnerEnvironmentCompletedAction);
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
            (rxResponse) => this.sendAction(port, {
                type: RxRunnerEnvironmentAction.RUNNER_RX_EMIT,
                id: action.id,
                response: rxResponse,
            } as IRxRunnerEnvironmentEmitAction),
            (error) => this.sendAction(port, {
                type: RxRunnerEnvironmentAction.RUNNER_RX_ERROR,
                id: action.id,
                errorCode: RxRunnerErrorCode.ERROR_EMIT,
                ...extractError(error),
            } as IRxRunnerEnvironmentErrorAction),
            () => this.sendAction(port, {
                type: RxRunnerEnvironmentAction.RUNNER_RX_COMPLETED,
                id: action.id,
            } as IRxRunnerEnvironmentCompletedAction),
        );
    }

    public async destroy(port?: MessagePort, action?: IRunnerControllerDestroyAction): Promise<void> {
        this.unsubscribe$.next('ALL');
        super.destroy(port, action);
    }
}
