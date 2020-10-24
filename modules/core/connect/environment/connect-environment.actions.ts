import { BanProperties } from "../../types/ban-properties";
import { JsonObject, TransferableJsonObject } from "../../types/json-object";

export enum ConnectEnvironmentAction {
    DISCONNECTED = 'DISCONNECTED',
    DESTROYED_BY_REQUEST = 'DESTROYED_BY_REQUEST',
    DESTROYED_WITH_ERROR = 'DESTROYED_WITH_ERROR',
    DESTROYED_BY_FORCE = 'DESTROYED_BY_FORCE',
}

export type IConnectEnvironmentAction = {
    id: number;
} & Partial<Record<string, TransferableJsonObject>>

export interface IConnectEnvironmentDisconnectedAction {
    id: number;
    type: ConnectEnvironmentAction.DISCONNECTED;
}

export interface IConnectEnvironmentDestroyedByRequestAction {
    id: number;
    type: ConnectEnvironmentAction.DESTROYED_BY_REQUEST;
}

export type IConnectEnvironmentDestroyedWithErrorAction = {
    id: number;
    type: ConnectEnvironmentAction.DESTROYED_WITH_ERROR;
    error: Record<string, JsonObject>,
}

export interface IConnectEnvironmentDestroyedByForceAction {
    type: ConnectEnvironmentAction.DESTROYED_BY_FORCE;
}

export type IConnectEnvironmentActions =
    | IConnectEnvironmentDisconnectedAction
    | IConnectEnvironmentDestroyedByRequestAction
    | IConnectEnvironmentDestroyedWithErrorAction
    | IConnectEnvironmentDestroyedByForceAction;

export interface IPossibleConnectEnvironmentActionProperties {
    transfer?: Transferable[]
}

type IBannedConnectEnvironmentActionProperties
    = Omit<IConnectEnvironmentActions, keyof IPossibleConnectEnvironmentActionProperties>
    & {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: any;
    }


export type IConnectEnvironmentActionPropertiesRequirements<T> = 
    BanProperties<T, IBannedConnectEnvironmentActionProperties> & IPossibleConnectEnvironmentActionProperties;
