import { ISerializedErrorAction } from '../errors/error.serializer';
import { JsonObject, TransferableJsonObject } from '../types/json-object';

export enum RunnerEnvironmentAction {
    EXECUTED = 10,
    EXECUTED_WITH_RUNNER_RESULT,
    DISCONNECTED,
    DESTROYED,

    EXECUTE_ERROR,
    DESTROY_ERROR,

    RESOLVED,
}

export interface IRunnerEnvironmentExecutedAction {
    type: RunnerEnvironmentAction.EXECUTED;
    id: number;
    response: JsonObject | TransferableJsonObject;
}

export interface IRunnerEnvironmentExecutedWithRunnerResultAction {
    type: RunnerEnvironmentAction.EXECUTED_WITH_RUNNER_RESULT;
    id: number;
    port: MessagePort;
    runnerId: number;
}

export interface IRunnerEnvironmentDisconnectedAction {
    type: RunnerEnvironmentAction.DISCONNECTED;
    id: number;
}

export interface IRunnerEnvironmentDestroyedAction {
    type: RunnerEnvironmentAction.DESTROYED;
    id: number;
}

export type IRunnerEnvironmentExecuteErrorAction = ISerializedErrorAction<RunnerEnvironmentAction.EXECUTE_ERROR>;

export type IRunnerEnvironmentDestroyErrorAction = ISerializedErrorAction<RunnerEnvironmentAction.DESTROY_ERROR>;

export interface IRunnerEnvironmentResolvedAction {
    type: RunnerEnvironmentAction.RESOLVED;
    id: number;
    port: MessagePort;
}

export type IRunnerEnvironmentAction<T extends RunnerEnvironmentAction = RunnerEnvironmentAction> = Extract<
    IRunnerEnvironmentExecutedAction  | IRunnerEnvironmentExecuteErrorAction
        | IRunnerEnvironmentExecutedWithRunnerResultAction| IRunnerEnvironmentDisconnectedAction
        | IRunnerEnvironmentDestroyedAction | IRunnerEnvironmentDestroyErrorAction
        | IRunnerEnvironmentResolvedAction,
    {type: T}
>;
