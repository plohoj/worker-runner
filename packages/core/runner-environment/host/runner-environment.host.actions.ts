import { ISerializedError } from '../../errors/error.serializer';
import { TransferableJsonLike } from '../../types/json-like';
import { RunnerToken } from "../../types/runner-identifier";

export enum RunnerEnvironmentHostAction {
    /** Method execution result */
    EXECUTED = 'EXECUTED',
    // TODO
    /**
     * @deprecate There must be an implementation that handles different types of return values
     * with and without Transferable wrapper
     */
    EXECUTED_WITH_RUNNER_RESULT = 'EXECUTED_WITH_RUNNER_RESULT',
    /** Error while executing an action */
    ERROR = 'ERROR',
    /** Duplicated environment that manages the same Runner instance */
    CLONED = 'CLONED',
    /** Method names for the Runner instance used in the current environment */
    OWN_METADATA = 'OWN_METADATA',

    /** Successful disconnect action */
    DISCONNECTED = 'DISCONNECTED',
    /**
     * Runner successfully destroyed by destroy request
     * or if last connection disconnected or if RunnerResolverHost was destroyed
     */
    DESTROYED = 'DESTROYED',
}

export type IRunnerEnvironmentHostExecutedAction = {
    type: RunnerEnvironmentHostAction.EXECUTED;
    response: TransferableJsonLike;
}

export type IRunnerEnvironmentHostExecutedWithRunnerResultAction = {
    type: RunnerEnvironmentHostAction.EXECUTED_WITH_RUNNER_RESULT;
    token: RunnerToken;
}

export type IRunnerEnvironmentHostErrorAction = {
    type: RunnerEnvironmentHostAction.ERROR;
    error: ISerializedError,
}

export type IRunnerEnvironmentHostClonedAction = {
    type: RunnerEnvironmentHostAction.CLONED;
}

export type IRunnerEnvironmentHostOwnMetadataAction = {
    type: RunnerEnvironmentHostAction.OWN_METADATA;
    methodsNames: string[],
}

export type IRunnerEnvironmentHostDisconnectedAction = {
    type: RunnerEnvironmentHostAction.DISCONNECTED;
}

export type IRunnerEnvironmentHostDestroyedAction = {
    type: RunnerEnvironmentHostAction.DESTROYED;
}

export type IRunnerEnvironmentHostExecuteResultAction = 
    | IRunnerEnvironmentHostExecutedAction
    | IRunnerEnvironmentHostExecutedWithRunnerResultAction;

export type IRunnerEnvironmentHostAction = 
    | IRunnerEnvironmentHostExecutedAction
    | IRunnerEnvironmentHostExecutedWithRunnerResultAction
    | IRunnerEnvironmentHostErrorAction
    | IRunnerEnvironmentHostClonedAction
    | IRunnerEnvironmentHostOwnMetadataAction
    | IRunnerEnvironmentHostDisconnectedAction
    | IRunnerEnvironmentHostDestroyedAction;
