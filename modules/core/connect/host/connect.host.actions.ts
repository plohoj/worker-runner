import { ISerializedError } from "../../errors/error.serializer";
import { IConnectCustomAction } from "../client/connect.client.actions";

export enum ConnectHostAction {
    DISCONNECTED = 'DISCONNECTED',
    DESTROYED_BY_REQUEST = 'DESTROYED_BY_REQUEST',
    DESTROYED_WITH_ERROR = 'DESTROYED_WITH_ERROR',

    DESTROYED_BY_FORCE = 'DESTROYED_BY_FORCE',

    CUSTOM_RESPONSE = 'CUSTOM_RESPONSE',
    CUSTOM_ERROR = 'CUSTOM_ERROR',
}

export interface IConnectHostDisconnectedAction {
    id: number;
    type: ConnectHostAction.DISCONNECTED;
}

export interface IConnectHostDestroyedByRequestAction {
    id: number;
    type: ConnectHostAction.DESTROYED_BY_REQUEST;
}

export type IConnectHostDestroyedWithErrorAction = {
    id: number;
    type: ConnectHostAction.DESTROYED_WITH_ERROR;
    error: ISerializedError,
}

export interface IConnectHostDestroyedByForceAction {
    type: ConnectHostAction.DESTROYED_BY_FORCE;
}

export interface IConnectHostCustomResponseAction {
    id: number;
    type: ConnectHostAction.CUSTOM_RESPONSE;
    payload: IConnectCustomAction,
}

export interface IConnectHostCustomErrorAction {
    id: number;
    type: ConnectHostAction.CUSTOM_ERROR;
    error: ISerializedError,
}

export type IConnectHostActions =
    | IConnectHostDisconnectedAction
    | IConnectHostDestroyedByRequestAction
    | IConnectHostDestroyedWithErrorAction
    | IConnectHostDestroyedByForceAction
    | IConnectHostCustomResponseAction
    | IConnectHostCustomErrorAction;
