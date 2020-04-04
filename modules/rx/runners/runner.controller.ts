import { IRunnerControllerAction, IRunnerControllerDestroyAction, IRunnerEnvironmentAction, JsonObject, RunnerConstructor, RunnerController, RunnerEnvironmentAction, RunnerExecuteError, RunnerNotInitError } from '@worker-runner/core';
import { Observable, Subscriber } from 'rxjs';
import { IRxRunnerControllerAction, RxRunnerControllerAction } from '../actions/runner-controller.actions';
import { IRxRunnerEnvironmentAction, IRxRunnerEnvironmentCompletedAction, IRxRunnerEnvironmentEmitAction, IRxRunnerEnvironmentEmitWithRunnerResultAction, IRxRunnerEnvironmentErrorAction, IRxRunnerEnvironmentInitAction, RxRunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { RxWorkerRunnerErrorMessages } from '../errors/error-messages';
import { RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { IRxRunnerSerializedMethodResult } from '../types/resolved-runner';

export class RxRunnerController<R extends RunnerConstructor> extends RunnerController<R> {
    /** {actionId: Subscriber} */
    public readonly subscribers$ = new Map<number, Subscriber<JsonObject>>();

    protected readonly errorSerializer = RX_WORKER_RUNNER_ERROR_SERIALIZER;

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
                // throw {
                //     error,
                //     errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                //     message: RunnerErrorMessages.RUNNER_NOT_INIT,
                // } as IRunnerError;
                console.error(error);
                debugger; // TODO
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
        this.getSubscriber(action.id).error(this.errorSerializer.deserialize(action));
    }

    private runnerObservableCompleted(action: IRxRunnerEnvironmentCompletedAction): void {
        this.getSubscriber(action.id).complete();
        this.subscribers$.delete(action.id);
    }

    private getSubscriber(actionId: number): Subscriber<IRxRunnerSerializedMethodResult> {
        const completedSubscriber$ = this.subscribers$.get(actionId);
        if (!completedSubscriber$) {
            throw new RunnerExecuteError({message: RxWorkerRunnerErrorMessages.SUBSCRIBER_NOT_FOUND});
        }
        return completedSubscriber$;
    }


    public onDisconnect(closePort = true): void {
        this.subscribers$.forEach(subscriber => {
            subscriber.error(new RunnerNotInitError()); // TODO Will destroyed
            subscriber.complete();
        });
        this.subscribers$.clear();
        super.onDisconnect(closePort);
    }
}
