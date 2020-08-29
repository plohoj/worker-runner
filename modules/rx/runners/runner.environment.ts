import { IRunnerControllerAction, IRunnerControllerDestroyAction, IRunnerControllerExecuteAction, JsonObject, RunnerBridge, RunnerConstructor, RunnerEnvironment, RunnerExecuteError, RUNNER_BRIDGE_CONTROLLER, TransferRunnerData, WorkerRunnerErrorCode, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { Observable, Subject } from 'rxjs';
import { filter, mergeMap, takeUntil } from 'rxjs/operators';
import { IRxRunnerControllerSubscribeAction, IRxRunnerControllerUnsubscribeAction, RxRunnerControllerAction } from '../actions/runner-controller.actions';
import { IRxRunnerEnvironmentAction, IRxRunnerEnvironmentCompletedAction, IRxRunnerEnvironmentErrorAction, RxRunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { RxWorkerRunnerErrorCode } from '../errors/error-code';
import { RX_WORKER_RUNNER_ERROR_MESSAGES } from '../errors/error-messages';
import { RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RxRunnerEmitError, RxRunnerSubscriptionNotFoundError } from '../errors/runner-errors';
import { IRxRunnerMethodResult, IRxRunnerSerializedMethodResult } from '../types/resolved-runner';

export class RxRunnerEnvironment<R extends RunnerConstructor> extends RunnerEnvironment<R> {
    protected readonly errorSerializer = RX_WORKER_RUNNER_ERROR_SERIALIZER;
    protected declare sendAction: (
        port: MessagePort,
        action: IRxRunnerEnvironmentAction,
        transfer?: Transferable[],
    ) => void;

    /** { actionId: Observable } */
    private observableList = new Map<number, Observable<IRxRunnerMethodResult>>();
    /** Event for stop listening the Observable */
    private unsubscribe$ = new Subject<number | 'ALL'>();

    public async handleAction(
        port: MessagePort,
        action: IRunnerControllerAction
            | IRxRunnerControllerSubscribeAction | IRxRunnerControllerUnsubscribeAction,
    ): Promise<void> {
        switch (action.type) {
            case RxRunnerControllerAction.RX_SUBSCRIBE:
            case RxRunnerControllerAction.RX_UNSUBSCRIBE:
                try {
                    this.execute(port, action);
                } catch (error) {
                    this.sendAction(port, {
                        id: action.id,
                        type: RxRunnerEnvironmentAction.RX_ERROR,
                        ... this.errorSerializer.serialize(error, {
                            errorCode: WorkerRunnerErrorCode.RUNNER_EXECUTE_ERROR,
                            name: RunnerExecuteError.name,
                            message: WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR({runnerName: this.runnerName}),
                            stack: error?.stack || new Error().stack,
                        }),
                    });
                }
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

    public async destroy(port?: MessagePort, action?: IRunnerControllerDestroyAction): Promise<void> {
        this.unsubscribe$.next('ALL');
        this.observableList.clear();
        super.destroy(port, action);
    }

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

    private observeResponse(
        port: MessagePort,
        action: IRxRunnerControllerSubscribeAction,
    ): void {
        const observable = this.observableList.get(action.id);
        this.observableList.delete(action.id);
        if (!observable) {
            this.sendAction(port, {
                id: action.id,
                type: RxRunnerEnvironmentAction.RX_ERROR,
                ... this.errorSerializer.serialize(new RxRunnerSubscriptionNotFoundError({
                    message: RX_WORKER_RUNNER_ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND({runnerName: this.runnerName}),
                })),
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
                ... this.errorSerializer.serialize(error, {
                    errorCode: RxWorkerRunnerErrorCode.ERROR_EMIT,
                    message: RX_WORKER_RUNNER_ERROR_MESSAGES.EMITTED_ERROR({runnerName: this.runnerName}),
                    name: RxRunnerEmitError.name,
                    stack: error?.stack || new Error().stack,
                }),
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
            const runnerController = await (response as RunnerBridge)[RUNNER_BRIDGE_CONTROLLER];
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
}
