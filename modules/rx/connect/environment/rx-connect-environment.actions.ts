import { BanProperties, IPossibleConnectEnvironmentActionProperties, TransferableJsonObject, IConnectEnvironmentActions, JsonObject } from "@worker-runner/core";

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
    response: {
        transfer?: Transferable[],
    } & Record<string, TransferableJsonObject>
    transfer?: Transferable[],
} 

export type IRxConnectEnvironmentErrorAction = {
    id: number;
    type: RxConnectEnvironmentAction.RX_ERROR,
    error: Record<string, JsonObject>
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

type IRxBannedConnectEnvironmentActionProperties
    = Omit<(IConnectEnvironmentActions | IRxConnectEnvironmentActions), keyof IPossibleConnectEnvironmentActionProperties>
    & {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: any;
    }

export type IRxConnectEnvironmentActionPropertiesRequirements<T> = 
    BanProperties<T, IRxBannedConnectEnvironmentActionProperties> & IPossibleConnectEnvironmentActionProperties;
