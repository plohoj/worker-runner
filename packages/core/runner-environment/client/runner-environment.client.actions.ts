import { ICollectionTransferPluginSendArrayData } from '../../plugins/transfer-plugin/collection-transfer-plugin/collection-transfer-plugin-data';

export enum RunnerEnvironmentClientAction {
    /** 
     * Notification to EnvironmentHost that the environment has been initialized.
     * If during initialization the environment was destroyed,
     * then EnvironmentHost will re-send the destroyed action
     */
    INITIATED = 'INITIATED',
    /** Request to execute a method */
    EXECUTE = 'EXECUTE',
    /** Environment clone request. Duplicated Environment Manages the Same Runner Instance */
    CLONE = 'CLONE',
    /** Requesting method names for the Runner instance used in the current environment */
    OWN_METADATA = 'OWN_METADATA',
    /**
     * The action reports that the control of the Runner will be transferred to another Runner Resolver Host
     * and that the current execution of methods must be interrupted.
     */
    TRANSFER = 'TRANSFER',
    DISCONNECT = 'DISCONNECT',
    DESTROY = 'DESTROY',
}

export type IRunnerEnvironmentClientInitiatedAction = {
    type: RunnerEnvironmentClientAction.INITIATED;
}

export type IRunnerEnvironmentClientExecuteAction = {
    type: RunnerEnvironmentClientAction.EXECUTE;
    method: string;
    args: ICollectionTransferPluginSendArrayData;
}

export type IRunnerEnvironmentClientCloneAction = {
    type: RunnerEnvironmentClientAction.CLONE;
}

export type IRunnerEnvironmentClientRequestRunnerOwnDataAction = {
    type: RunnerEnvironmentClientAction.OWN_METADATA;
}

export interface IRunnerEnvironmentClientTransferAction {
    type: RunnerEnvironmentClientAction.TRANSFER;
}

export interface IRunnerEnvironmentClientDisconnectAction {
    type: RunnerEnvironmentClientAction.DISCONNECT;
}

export interface IRunnerEnvironmentClientDestroyAction {
    type: RunnerEnvironmentClientAction.DESTROY;
}

export type IRunnerEnvironmentClientAction =
    | IRunnerEnvironmentClientInitiatedAction
    | IRunnerEnvironmentClientExecuteAction
    | IRunnerEnvironmentClientCloneAction
    | IRunnerEnvironmentClientRequestRunnerOwnDataAction
    | IRunnerEnvironmentClientTransferAction
    | IRunnerEnvironmentClientDisconnectAction
    | IRunnerEnvironmentClientDestroyAction;
