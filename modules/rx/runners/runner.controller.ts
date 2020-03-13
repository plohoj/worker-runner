import { IRunnerControllerAction, IRunnerControllerDestroyAction, IRunnerEnvironmentAction, IRunnerError, JsonObject, RunnerConstructor, RunnerController, RunnerEnvironmentAction, RunnerErrorCode, RunnerErrorMessages } from '@worker-runner/core';
import { Observable, Subscriber } from 'rxjs';
import { IRxRunnerControllerAction, RxRunnerControllerAction } from '../actions/runner-controller.actions';
import { IRxRunnerEnvironmentAction, IRxRunnerEnvironmentCompletedAction, IRxRunnerEnvironmentEmitAction, IRxRunnerEnvironmentEmitWithRunnerResultAction, IRxRunnerEnvironmentErrorAction, IRxRunnerEnvironmentInitAction, RxRunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { IRxRunnerSerializedMethodResult } from '../resolved-runner';
import { RxRunnerErrorMessages } from '../runners-errors';

export class RxRunnerController<R extends RunnerConstructor> extends RunnerController<R> {
    /** {actionId: Subscriber} */
    public readonly subscribers$ = new Map<number, Subscriber<JsonObject>>();

    protected declare sendAction: (action: IRxRunnerControllerAction | IRunnerControllerAction) => void;

    protected async handleAction(
        action: IRunnerControllerDestroyAction | IRxRunnerEnvironmentAction | IRunnerEnvironmentAction,
    ): Promise<void> {
        switch (action.type) {
            case RxRunnerEnvironmentAction.RX_INIT:
                this.runnerObservableInit(action);
                break;
            case RxRunnerEnvironmentAction.RX_EMIT:
                this.runnerObservableEmit(action);
                break;
            case RxRunnerEnvironmentAction.RX_EMIT_WITH_RUNNER_RESULT:
                this.runnerObservableEmitWithRunnerResult(action);
                break;
            case RxRunnerEnvironmentAction.RX_ERROR:
                this.runnerObservableError(action);
                break;
            case RxRunnerEnvironmentAction.RX_COMPLETED:
                this.runnerObservableCompleted(action);
                break;
            default:
                super.handleAction(action as IRunnerEnvironmentAction);
                break;
        }
    }

    private runnerObservableInit(action: IRxRunnerEnvironmentInitAction): void {
        const observable = new Observable<JsonObject>(subscriber => {
            try {
                this.subscribers$.set(action.id, subscriber);
            } catch (error) {
                throw {
                    error,
                    errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                    message: RunnerErrorMessages.RUNNER_NOT_INIT,
                } as IRunnerError;
            }
            this.sendAction({
                type: RxRunnerControllerAction.RX_SUBSCRIBE,
                id: action.id,
            });
        });
        super.handleAction({
            ...action,
            type: RunnerEnvironmentAction.EXECUTED,
            id: action.id,
            response: observable as any,
        });
    }

    private runnerObservableEmit(action: IRxRunnerEnvironmentEmitAction): void {
        this.getSubscriber(action.id).next(action.response);
    }

    private async runnerObservableEmitWithRunnerResult(
        action: IRxRunnerEnvironmentEmitWithRunnerResultAction,
    ): Promise<void> {
        this.getSubscriber(action.id).next(
            this.buildControlClone(action.runnerId, action.port).resolvedRunner,
        );
    }

    private runnerObservableError(action: IRxRunnerEnvironmentErrorAction): void {
        this.getSubscriber(action.id).error(action.error);
    }

    private runnerObservableCompleted(action: IRxRunnerEnvironmentCompletedAction): void {
        this.getSubscriber(action.id).complete();
        this.subscribers$.delete(action.id);
    }

    private getSubscriber(actionId: number): Subscriber<IRxRunnerSerializedMethodResult> {
        const completedSubscriber$ = this.subscribers$.get(actionId);
        const error = new Error(RxRunnerErrorMessages.SUBSCRIBER_NOT_FOUND);
        if (!completedSubscriber$) {
            throw {
                error,
                message: RxRunnerErrorMessages.SUBSCRIBER_NOT_FOUND,
                errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                stacktrace: error.stack,
            };
        }
        return completedSubscriber$;
    }


    public onDisconnect(closePort = true): void {
        this.subscribers$.forEach(subscriber => {
            const error = new Error(RunnerErrorMessages.RUNNER_NOT_INIT);
            subscriber.error({
                error,
                message: RunnerErrorMessages.RUNNER_NOT_INIT,
                errorCode: RunnerErrorCode.RUNNER_NOT_INIT,
                stacktrace: error.stack,
            } as IRunnerError);
            subscriber.complete();
        });
        this.subscribers$.clear();
        super.onDisconnect(closePort);
    }
}
