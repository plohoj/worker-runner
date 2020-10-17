import { BanProperties } from "../../types/ban-properties";
import { TransferableJsonObject } from "../../types/json-object";

export enum ConnectControllerAction {
    INTERRUPT_LISTENING = 'INTERRUPT_LISTENING',
    DISCONNECT = 'DISCONNECT',
    DESTROY = 'DESTROY',
}

export type IConnectControllerAction = {
    id: number;
} & Partial<Record<string, TransferableJsonObject>>

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

export type IConnectControllerActions =
    | IConnectControllerInterruptListeningAction
    | IConnectControllerDisconnectAction
    | IConnectControllerDestroyAction;

type IBannedConnectControllerActionProperties = IConnectControllerActions & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: any;
}

export interface IPossibleConnectControllerActionProperties {
    transfer?: Transferable[]
}

export type IConnectControllerActionPropertiesRequirements<T> = 
    BanProperties<T, IBannedConnectControllerActionProperties> & IPossibleConnectControllerActionProperties;
