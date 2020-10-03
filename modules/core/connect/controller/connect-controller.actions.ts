import { BanProperties } from "../../types/ban-properties";
import { TransferableJsonObject } from "../../types/json-object";

export enum ConnectControllerAction {
    DISCONNECT = 'DISCONNECT',
    DESTROY = 'DESTROY',
}

export type IConnectControllerAction = {
    id: number;
} & Partial<Record<string, TransferableJsonObject>>

export interface IConnectControllerDestroyAction {
    id: number;
    type: ConnectControllerAction.DESTROY;
}

export interface IConnectControllerDisconnectAction {
    id: number;
    type: ConnectControllerAction.DISCONNECT;
}

export type IConnectControllerActions = IConnectControllerDestroyAction | IConnectControllerDisconnectAction;

type IBannedConnectControllerActionProperties = IConnectControllerActions & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: any;
}

export interface IPossibleConnectControllerActionProperties {
    transfer?: Transferable[]
}

export type IConnectControllerActionPropertiesRequirements<T> = 
    BanProperties<T, IBannedConnectControllerActionProperties> & IPossibleConnectControllerActionProperties;
