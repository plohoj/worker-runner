import { ISerializedError, TransferPluginDataType, TransferPluginSendData } from "@worker-runner/core";

export enum RxTransferPluginHostAction {
    RX_EMIT = 'RX_EMIT',
    RX_ERROR = 'RX_ERROR',
    RX_COMPLETED = 'RX_COMPLETED',
    RX_NOT_FOUND = 'RX_NOT_FOUND',
}

export type IRxTransferPluginHostEmitAction = {
    type: RxTransferPluginHostAction.RX_EMIT;
    data: TransferPluginSendData;
    dataType: TransferPluginDataType;
} 

export type IRxTransferPluginHostErrorAction = {
    type: RxTransferPluginHostAction.RX_ERROR;
    error: ISerializedError
};

export interface IRxTransferPluginHostCompletedAction {
    type: RxTransferPluginHostAction.RX_COMPLETED;
}

export interface IRxTransferPluginHostNotFoundAction {
    type: RxTransferPluginHostAction.RX_NOT_FOUND;
}

export type IRxTransferPluginHostActions =
    | IRxTransferPluginHostEmitAction
    | IRxTransferPluginHostErrorAction
    | IRxTransferPluginHostCompletedAction
    | IRxTransferPluginHostNotFoundAction;
