import { RunnerErrorCode } from '../errors/runners-errors';
import { StackTraceError } from '../errors/stacktrace-error';
import { JsonObject } from '../types/json-object';

export enum RunnerEnvironmentAction {
    INITED = 10,
    EXECUTED,
    DESTROYED,

    INIT_ERROR,
    EXECUTE_ERROR,
    DESTROY_ERROR,

    RESOLVED,
}

export interface IRunnerEnvironmentInitedAction {
    type: RunnerEnvironmentAction.INITED;
    id: number;
    port: MessagePort;
}

export interface IRunnerEnvironmentExecutedAction {
    type: RunnerEnvironmentAction.EXECUTED;
    id: number;
    response: JsonObject;
}

export interface IRunnerEnvironmentDestroyedAction {
    type: RunnerEnvironmentAction.DESTROYED;
    id: number;
}

export type IRunnerEnvironmentInitErrorAction = StackTraceError<{
    type: RunnerEnvironmentAction.INIT_ERROR;
    errorCode: RunnerErrorCode.RUNNER_INIT_ERROR;
    id: number;
}>;

export type IRunnerEnvironmentExecuteErrorAction = StackTraceError<{
    type: RunnerEnvironmentAction.EXECUTE_ERROR;
    errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
    id: number;
}>;

export type IRunnerEnvironmentDestroyErrorAction = StackTraceError<{
    type: RunnerEnvironmentAction.DESTROY_ERROR;
    errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
    id: number;
}>;

export interface IRunnerEnvironmentResolvedAction {
    type: RunnerEnvironmentAction.RESOLVED;
    id: number;
    port: MessagePort;
    runnerId: number;
}

export type IRunnerEnvironmentAction<T extends RunnerEnvironmentAction = RunnerEnvironmentAction> = Extract<
    IRunnerEnvironmentInitedAction | IRunnerEnvironmentExecutedAction
        | IRunnerEnvironmentDestroyedAction | IRunnerEnvironmentInitErrorAction
        | IRunnerEnvironmentExecuteErrorAction | IRunnerEnvironmentDestroyErrorAction
        | IRunnerEnvironmentResolvedAction,
    {type: T}
>;
