import { RunnerErrorCode } from '../errors/runners-errors';
import { StackTraceError } from '../errors/stacktrace-error';
import { JsonObject } from '../types/json-object';

export enum WorkerAction {
    WORKER_INIT,
    WORKER_DESTROYED,
    WORKER_ERROR,

    RUNNER_INIT,
    RUNNER_EXECUTED,
    RUNNER_DESTROYED,

    RUNNER_INIT_ERROR,
    RUNNER_EXECUTE_ERROR,
    RUNNER_DESTROY_ERROR,
}

export interface IWorkerInitAction {
    type: WorkerAction.WORKER_INIT;
}

export interface IWorkerRunnerInitAction {
    type: WorkerAction.RUNNER_INIT;
    instanceId: number;
}

export interface IWorkerRunnerExecutedAction {
    type: WorkerAction.RUNNER_EXECUTED;
    actionId: number;
    instanceId: number;
    response: JsonObject;
}

export interface IWorkerRunnerDestroyedAction {
    type: WorkerAction.RUNNER_DESTROYED;
    instanceId: number;
}

export type IWorkerRunnerInitErrorAction = StackTraceError<{
    type: WorkerAction.RUNNER_INIT_ERROR;
    errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_ERROR | RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND;
    instanceId: number;
}>;

export type IWorkerRunnerExecuteErrorAction = StackTraceError<{
    type: WorkerAction.RUNNER_EXECUTE_ERROR;
    errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR | RunnerErrorCode.RUNNER_EXECUTE_INSTANCE_NOT_FOUND,
    actionId: number;
    instanceId: number;
}>;

export type IWorkerRunnerDestroyErrorAction = StackTraceError<{
    type: WorkerAction.RUNNER_DESTROY_ERROR;
    errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR | RunnerErrorCode.RUNNER_DESTROY_INSTANCE_NOT_FOUND,
    instanceId: number;
}>;

export interface IWorkerDestroyedAction {
    type: WorkerAction.WORKER_DESTROYED;
}

export type IWorkerErrorAction = StackTraceError<{
    type: WorkerAction.WORKER_ERROR;
}>;

export type IWorkerAction<T extends WorkerAction = WorkerAction> = Extract<
    IWorkerInitAction | IWorkerDestroyedAction | IWorkerErrorAction
        | IWorkerRunnerInitAction | IWorkerRunnerExecutedAction
        | IWorkerRunnerDestroyedAction | IWorkerRunnerInitErrorAction
        | IWorkerRunnerExecuteErrorAction | IWorkerRunnerDestroyErrorAction,
    {type: T}
>;
