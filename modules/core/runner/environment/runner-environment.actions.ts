import { ISerializedErrorAction } from '../../errors/error.serializer';
import { TransferableJsonObject } from '../../types/json-object';
import { RunnerToken } from '../runner-bridge/runners-list.controller';

export enum RunnerEnvironmentAction {
    EXECUTED = 'EXECUTED',
    EXECUTED_WITH_RUNNER_RESULT = 'EXECUTED_WITH_RUNNER_RESULT',
    EXECUTE_ERROR = 'EXECUTE_ERROR',
    RESOLVED = 'RESOLVED',
}

export interface IRunnerEnvironmentExecutedAction {
    type: RunnerEnvironmentAction.EXECUTED;
    response: TransferableJsonObject;
    transfer?: Transferable[]
}

export interface IRunnerEnvironmentExecutedWithRunnerResultAction {
    type: RunnerEnvironmentAction.EXECUTED_WITH_RUNNER_RESULT;
    port: MessagePort;
    token: RunnerToken;
    transfer: [MessagePort];
}

export type IRunnerEnvironmentExecuteErrorAction = ISerializedErrorAction<RunnerEnvironmentAction.EXECUTE_ERROR>;

export interface IRunnerEnvironmentResolvedAction {
    type: RunnerEnvironmentAction.RESOLVED;
    port: MessagePort;
    transfer: [MessagePort];
}

export type IRunnerEnvironmentExecuteResultAction = 
    | IRunnerEnvironmentExecutedAction
    | IRunnerEnvironmentExecuteErrorAction
    | IRunnerEnvironmentExecutedWithRunnerResultAction;

export type IRunnerEnvironmentAction = 
    | IRunnerEnvironmentExecutedAction
    | IRunnerEnvironmentExecuteErrorAction
    | IRunnerEnvironmentExecutedWithRunnerResultAction
    | IRunnerEnvironmentResolvedAction;
