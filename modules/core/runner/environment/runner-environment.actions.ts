import { TransferableJsonObject } from '../../types/json-object';
import { RunnerToken } from "../../types/runner-identifier";

export enum RunnerEnvironmentAction {
    EXECUTED = 'EXECUTED',
    EXECUTED_WITH_RUNNER_RESULT = 'EXECUTED_WITH_RUNNER_RESULT',
    RESOLVED = 'RESOLVED',
    RUNNER_OWN_DATA = 'RUNNER_OWN_DATA',
}

export type IRunnerEnvironmentExecutedAction = {
    type: RunnerEnvironmentAction.EXECUTED;
    response: TransferableJsonObject;
    transfer?: Transferable[]
}

export type IRunnerEnvironmentExecutedWithRunnerResultAction = {
    type: RunnerEnvironmentAction.EXECUTED_WITH_RUNNER_RESULT;
    port: MessagePort;
    token: RunnerToken;
    transfer: [MessagePort];
}

export type IRunnerEnvironmentResolvedAction = {
    type: RunnerEnvironmentAction.RESOLVED;
    port: MessagePort;
    transfer: [MessagePort];
}

export type IRunnerEnvironmentOwnDataAction = {
    type: RunnerEnvironmentAction.RUNNER_OWN_DATA;
    methodsNames: string[],
}

export type IRunnerEnvironmentExecuteResultAction = 
    | IRunnerEnvironmentExecutedAction
    | IRunnerEnvironmentExecutedWithRunnerResultAction;

export type IRunnerEnvironmentAction = 
    | IRunnerEnvironmentExecutedAction
    | IRunnerEnvironmentExecutedWithRunnerResultAction
    | IRunnerEnvironmentResolvedAction
    | IRunnerEnvironmentOwnDataAction;
