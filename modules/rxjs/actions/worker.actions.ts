import { IWorkerAction, WorkerAction } from '@core/actions/worker.actions';
import { StackTraceError } from '@core/errors/stacktrace-error';
import { JsonObject } from '@core/types/json-object';

export enum RxWorkerAction {
    RUNNER_RX_INIT = 100,
    RUNNER_RX_EMIT,
    RUNNER_RX_ERROR,
    RUNNER_RX_COMPLETED,
}

export interface IRxWorkerRunnerInitAction {
    type: RxWorkerAction.RUNNER_RX_INIT;
    actionId: number;
    instanceId: number;
}

export interface IRxWorkerRunnerEmitAction {
    type: RxWorkerAction.RUNNER_RX_EMIT;
    actionId: number;
    instanceId: number;
    response: JsonObject;
}

export type IRxWorkerRunnerErrorAction = StackTraceError<{
    type: RxWorkerAction.RUNNER_RX_ERROR;
    actionId: number;
    instanceId: number;
}>;

export interface IRxWorkerRunnerCompletedAction {
    type: RxWorkerAction.RUNNER_RX_COMPLETED;
    actionId: number;
    instanceId: number;
}

export type IRxWorkerAction<T extends WorkerAction | RxWorkerAction = WorkerAction | RxWorkerAction>
    = T extends WorkerAction ? IWorkerAction<T> :
        Extract<IRxWorkerRunnerInitAction | IRxWorkerRunnerEmitAction
            | IRxWorkerRunnerErrorAction | IRxWorkerRunnerCompletedAction,
        {type: T}>;
