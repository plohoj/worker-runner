import { TransferableJsonObject } from "../../types/json-object";

export enum ConnectClientAction {
    /** The action requires no response. If the connection was terminated, a notification will be received */
    CONNECT = "CONNECT",
    INTERRUPT_LISTENING = 'INTERRUPT_LISTENING',
    DISCONNECT = 'DISCONNECT',
    DESTROY = 'DESTROY',

    CUSTOM = 'CUSTOM',
}

export interface IConnectClientConnectAction {
    type: ConnectClientAction.CONNECT;
}

export interface IConnectClientInterruptListeningAction {
    id: number;
    type: ConnectClientAction.INTERRUPT_LISTENING;
}

export interface IConnectClientDisconnectAction {
    id: number;
    type: ConnectClientAction.DISCONNECT;
}

export interface IConnectClientDestroyAction {
    id: number;
    type: ConnectClientAction.DESTROY;
}

export interface IConnectClientCustomAction {
    id: number;
    type: ConnectClientAction.CUSTOM;
    payload: IConnectCustomAction,
}


export type IConnectClientActions =
    | IConnectClientConnectAction
    | IConnectClientInterruptListeningAction
    | IConnectClientDisconnectAction
    | IConnectClientDestroyAction
    | IConnectClientCustomAction;

export type IConnectCustomAction = {
    [key: string]: TransferableJsonObject
    transfer?: Transferable[]
}
