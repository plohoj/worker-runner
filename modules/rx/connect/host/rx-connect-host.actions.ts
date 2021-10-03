import { ISerializedError, IConnectCustomAction } from "@worker-runner/core";

export enum RxConnectHostAction {
    RX_INIT = 'RX_INIT',
    RX_EMIT = 'RX_EMIT',
    RX_ERROR = 'RX_ERROR',
    RX_COMPLETED = 'RX_COMPLETED',
    RX_NOT_FOUND = 'RX_NOT_FOUND',
}

export interface IRxConnectHostInitAction {
    id: number;
    type: RxConnectHostAction.RX_INIT;
}

export type IRxConnectHostEmitAction = {
    id: number;
    type: RxConnectHostAction.RX_EMIT;
    response: IConnectCustomAction,
} 

export type IRxConnectHostErrorAction = {
    id: number;
    type: RxConnectHostAction.RX_ERROR,
    error: ISerializedError
};

export interface IRxConnectHostCompletedAction {
    id: number;
    type: RxConnectHostAction.RX_COMPLETED;
}

export interface IRxConnectHostNotFoundAction {
    id: number;
    type: RxConnectHostAction.RX_NOT_FOUND;
}

export type IRxConnectHostActions =
    | IRxConnectHostInitAction
    | IRxConnectHostEmitAction
    | IRxConnectHostErrorAction
    | IRxConnectHostCompletedAction
    | IRxConnectHostNotFoundAction;
