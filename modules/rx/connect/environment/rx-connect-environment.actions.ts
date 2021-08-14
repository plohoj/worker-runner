import { ISerializedError, IConnectCustomAction } from "@worker-runner/core";

export enum RxConnectEnvironmentAction {
    RX_INIT = 'RX_INIT',
    RX_EMIT = 'RX_EMIT',
    RX_ERROR = 'RX_ERROR',
    RX_COMPLETED = 'RX_COMPLETED',
    RX_NOT_FOUND = 'RX_NOT_FOUND',
}

export interface IRxConnectEnvironmentInitAction {
    id: number;
    type: RxConnectEnvironmentAction.RX_INIT;
}

export type IRxConnectEnvironmentEmitAction = {
    id: number;
    type: RxConnectEnvironmentAction.RX_EMIT;
    response: IConnectCustomAction,
} 

export type IRxConnectEnvironmentErrorAction = {
    id: number;
    type: RxConnectEnvironmentAction.RX_ERROR,
    error: ISerializedError
};

export interface IRxConnectEnvironmentCompletedAction {
    id: number;
    type: RxConnectEnvironmentAction.RX_COMPLETED;
}

export interface IRxConnectEnvironmentNotFoundAction {
    id: number;
    type: RxConnectEnvironmentAction.RX_NOT_FOUND;
}

export type IRxConnectEnvironmentActions =
    | IRxConnectEnvironmentInitAction
    | IRxConnectEnvironmentEmitAction
    | IRxConnectEnvironmentErrorAction
    | IRxConnectEnvironmentCompletedAction
    | IRxConnectEnvironmentNotFoundAction;
