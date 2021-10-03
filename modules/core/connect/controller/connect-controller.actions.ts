import { TransferableJsonObject } from "../../types/json-object";

export enum ConnectControllerAction {
    /** The action requires no response. If the connection was terminated, a notification will be received */
    CONNECT = "CONNECT",
    INTERRUPT_LISTENING = 'INTERRUPT_LISTENING',
    DISCONNECT = 'DISCONNECT',
    DESTROY = 'DESTROY',

    CUSTOM = 'CUSTOM',
}

export interface IConnectControllerConnectAction {
    type: ConnectControllerAction.CONNECT;
}

export interface IConnectControllerInterruptListeningAction {
    id: number;
    type: ConnectControllerAction.INTERRUPT_LISTENING;
}

export interface IConnectControllerDisconnectAction {
    id: number;
    type: ConnectControllerAction.DISCONNECT;
}

export interface IConnectControllerDestroyAction {
    id: number;
    type: ConnectControllerAction.DESTROY;
}

export interface IConnectControllerCustomAction {
    id: number;
    type: ConnectControllerAction.CUSTOM;
    payload: IConnectCustomAction,
}


export type IConnectControllerActions =
    | IConnectControllerConnectAction
    | IConnectControllerInterruptListeningAction
    | IConnectControllerDisconnectAction
    | IConnectControllerDestroyAction
    | IConnectControllerCustomAction;

export type IConnectCustomAction = {
    [key: string]: TransferableJsonObject
    transfer?: Transferable[]
}
