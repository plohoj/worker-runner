import { TransferableJsonLike } from '../../types/json-like';
import { RunnerToken } from "../../types/runner-identifier";

export enum RunnerEnvironmentHostAction {
    EXECUTED = 'EXECUTED',
    EXECUTED_WITH_RUNNER_RESULT = 'EXECUTED_WITH_RUNNER_RESULT',
    RESOLVED = 'RESOLVED',
    RUNNER_OWN_DATA = 'RUNNER_OWN_DATA',
}

export type IRunnerEnvironmentHostExecutedAction = {
    type: RunnerEnvironmentHostAction.EXECUTED;
    response: TransferableJsonLike;
    transfer?: Transferable[]
}

export type IRunnerEnvironmentHostExecutedWithRunnerResultAction = {
    type: RunnerEnvironmentHostAction.EXECUTED_WITH_RUNNER_RESULT;
    port: MessagePort;
    token: RunnerToken;
    transfer: [MessagePort];
}

export type IRunnerEnvironmentHostResolvedAction = {
    type: RunnerEnvironmentHostAction.RESOLVED;
    port: MessagePort;
    transfer: [MessagePort];
}

export type IRunnerEnvironmentHostOwnDataAction = {
    type: RunnerEnvironmentHostAction.RUNNER_OWN_DATA;
    methodsNames: string[],
}

export type IRunnerEnvironmentHostExecuteResultAction = 
    | IRunnerEnvironmentHostExecutedAction
    | IRunnerEnvironmentHostExecutedWithRunnerResultAction;

export type IRunnerEnvironmentHostAction = 
    | IRunnerEnvironmentHostExecutedAction
    | IRunnerEnvironmentHostExecutedWithRunnerResultAction
    | IRunnerEnvironmentHostResolvedAction
    | IRunnerEnvironmentHostOwnDataAction;
