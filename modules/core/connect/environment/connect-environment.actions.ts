import { ISerializedError } from "../../errors/error.serializer";
import { IConnectCustomAction } from "../controller/connect-controller.actions";

export enum ConnectEnvironmentAction {
    DISCONNECTED = 'DISCONNECTED',
    DESTROYED_BY_REQUEST = 'DESTROYED_BY_REQUEST',
    DESTROYED_WITH_ERROR = 'DESTROYED_WITH_ERROR',

    DESTROYED_BY_FORCE = 'DESTROYED_BY_FORCE',

    CUSTOM_RESPONSE = 'CUSTOM_RESPONSE',
    CUSTOM_ERROR = 'CUSTOM_ERROR',
}

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
    error: ISerializedError,
}

export interface IConnectEnvironmentDestroyedByForceAction {
    type: ConnectEnvironmentAction.DESTROYED_BY_FORCE;
}

export interface IConnectEnvironmentCustomResponseAction {
    id: number;
    type: ConnectEnvironmentAction.CUSTOM_RESPONSE;
    payload: IConnectCustomAction,
}

export interface IConnectEnvironmentCustomErrorAction {
    id: number;
    type: ConnectEnvironmentAction.CUSTOM_ERROR;
    error: ISerializedError,
}

export type IConnectEnvironmentActions =
    | IConnectEnvironmentDisconnectedAction
    | IConnectEnvironmentDestroyedByRequestAction
    | IConnectEnvironmentDestroyedWithErrorAction
    | IConnectEnvironmentDestroyedByForceAction
    | IConnectEnvironmentCustomResponseAction
    | IConnectEnvironmentCustomErrorAction;
