import { ISerializedError } from '../../errors/error.serializer';
import { TransferPluginDataType, TransferPluginSendData } from '../../plugins/transfer-plugin/transfer-plugin-data';

export enum RunnerEnvironmentHostAction {
    /** Method execution result */
    EXECUTED = 'EXECUTED', // TODO rename to RESPONSE
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
    responseType: TransferPluginDataType;
    response: TransferPluginSendData;
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

export type IRunnerEnvironmentHostAction = 
    | IRunnerEnvironmentHostExecutedAction
    | IRunnerEnvironmentHostErrorAction
    | IRunnerEnvironmentHostClonedAction
    | IRunnerEnvironmentHostOwnMetadataAction
    | IRunnerEnvironmentHostDisconnectedAction
    | IRunnerEnvironmentHostDestroyedAction;
