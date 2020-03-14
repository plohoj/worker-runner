import { extractError, IRunnerControllerAction, IRunnerControllerDestroyAction, IRunnerControllerExecuteAction, JsonObject, RunnerBridge, runnerBridgeController, RunnerConstructor, RunnerEnvironment, TransferRunnerData } from '@worker-runner/core';
import { Observable, Subject } from 'rxjs';
import { filter, mergeMap, takeUntil } from 'rxjs/operators';
import { IRxRunnerControllerSubscribeAction, IRxRunnerControllerUnsubscribeAction, RxRunnerControllerAction } from '../actions/runner-controller.actions';
import { IRxRunnerEnvironmentAction, IRxRunnerEnvironmentCompletedAction, IRxRunnerEnvironmentErrorAction, RxRunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { IRxRunnerMethodResult, IRxRunnerSerializedMethodResult } from '../resolved-runner';
import { RxRunnerErrorCode, RxRunnerErrorMessages } from '../runners-errors';

export class RxRunnerEnvironment<R extends RunnerConstructor> extends RunnerEnvironment<R> {
    /** { actionId: Observable } */
    private observableList = new Map<number, Observable<IRxRunnerMethodResult>>();
    /** Event for stop listening the Observable */
    private unsubscribe$ = new Subject<number | 'ALL'>();

    protected declare sendAction: (
        port: MessagePort,
        action: IRxRunnerEnvironmentAction,
        transfer?: Transferable[],
    ) => void;

    protected async handleExecuteResponse(
        port: MessagePort,
        action: IRunnerControllerExecuteAction,
        response: IRxRunnerMethodResult | Observable<IRxRunnerMethodResult>,
        transferable: Transferable[] = [],
    ): Promise<void> {
        if (response instanceof Observable) {
            this.observableList.set(action.id, response);
            this.sendAction(
                port,
                {
                    type: RxRunnerEnvironmentAction.RX_INIT,
                    id: action.id,
                },
                transferable,
            );
        } else {
            await super.handleExecuteResponse(port, action, response);
        }
    }

    public async handleAction(
        port: MessagePort,
        action: IRunnerControllerAction
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
                this.observableList.delete(action.id);
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
                type: RxRunnerEnvironmentAction.RX_ERROR,
                id: action.id,
                error: RxRunnerErrorMessages.SUBSCRIPTION_NOT_FOUND,
                stacktrace: error.stack,
                errorCode: RxRunnerErrorCode.SUBSCRIPTION_NOT_FOUND,
            } as IRxRunnerEnvironmentErrorAction);
            this.sendAction(port, {
                type: RxRunnerEnvironmentAction.RX_COMPLETED,
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
            mergeMap(this.handleObservableResponse.bind(this, port, action)),
        )
        .subscribe({
            error: (error) => this.sendAction(port, {
                type: RxRunnerEnvironmentAction.RX_ERROR,
                id: action.id,
                errorCode: RxRunnerErrorCode.ERROR_EMIT,
                ...extractError(error),
            } as IRxRunnerEnvironmentErrorAction),
            complete: () => {
                this.sendAction(port, {
                    type: RxRunnerEnvironmentAction.RX_COMPLETED,
                    id: action.id,
                });
                this.observableList.delete(action.id);
            },
        });
    }

    private async handleObservableResponse(
        port: MessagePort,
        action: IRxRunnerControllerSubscribeAction,
        responseWithTransferData: IRxRunnerMethodResult,
    ) {
        const transferable = new Array<Transferable>();
        let response: IRxRunnerSerializedMethodResult;
        if (responseWithTransferData instanceof TransferRunnerData) {
            transferable.push(...responseWithTransferData.transfer);
            response = responseWithTransferData.data;
        } else {
            response = responseWithTransferData;
        }
        if (RunnerBridge.isRunnerBridge(response)) {
            const runnerController = await (response as RunnerBridge)[runnerBridgeController];
            const transferPort: MessagePort =  await runnerController.resolveOrTransferControl();
            this.sendAction(
                port,
                {
                    type: RxRunnerEnvironmentAction.RX_EMIT_WITH_RUNNER_RESULT,
                    id: action.id,
                    runnerId: runnerController.runnerId,
                    port: transferPort,
                },
                [transferPort, ...transferable],
            );
        } else {
            this.sendAction(
                port,
                {
                    type: RxRunnerEnvironmentAction.RX_EMIT,
                    id: action.id,
                    response: response as JsonObject,
                },
                transferable,
            );
        }
    }

    public async destroy(port?: MessagePort, action?: IRunnerControllerDestroyAction): Promise<void> {
        this.unsubscribe$.next('ALL');
        this.observableList.clear();
        super.destroy(port, action);
    }
}
