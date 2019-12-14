import { IWorkerAction, WorkerAction } from '@core/actions/worker.actions';
import { StackTraceError } from '@core/errors/stacktrace-error';
import { JsonObject } from '@core/types/json-object';

export enum RxWorkerAction {
    RUNNER_RX_INIT = 100,
    RUNNER_RX_EMIT,
    RUNNER_RX_ERROR,
    RUNNER_RX_COMPLETED,
}

export interface IWorkerRunnerRxInitAction {
    type: RxWorkerAction.RUNNER_RX_INIT;
    actionId: number;
    instanceId: number;
}

export interface IWorkerRunnerRxEmitAction {
    type: RxWorkerAction.RUNNER_RX_EMIT;
    actionId: number;
    instanceId: number;
    response: JsonObject;
}

export type IWorkerRunnerRxErrorAction = StackTraceError<{
    type: RxWorkerAction.RUNNER_RX_ERROR;
}>;

export interface IWorkerRunnerRxCompletedAction {
    type: RxWorkerAction.RUNNER_RX_COMPLETED;
    actionId: number;
    instanceId: number;
}

export type IWorkerRxAction<T extends WorkerAction | RxWorkerAction = WorkerAction | RxWorkerAction>
    = T extends WorkerAction ? IWorkerAction<T> :
        Extract<IWorkerRunnerRxInitAction | IWorkerRunnerRxEmitAction
            | IWorkerRunnerRxErrorAction | IWorkerRunnerRxCompletedAction,
        {type: T}>;
