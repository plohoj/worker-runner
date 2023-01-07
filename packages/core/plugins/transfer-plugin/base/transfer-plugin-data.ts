import { Nominal } from '../../../types/nominal';

declare const transferPluginDataType: unique symbol;
export type TransferPluginDataType = Nominal<typeof transferPluginDataType>;
declare const transferPluginSendData: unique symbol;
export type TransferPluginSendData = Nominal<typeof transferPluginSendData>;
declare const transferPluginReceivedData: unique symbol;
export type TransferPluginReceivedData = Nominal<typeof transferPluginReceivedData>;

export type TransferPluginCancelPreparedDataFunction = () => void | Promise<void>;

export interface ITransferPluginPreparedData {
    data: TransferPluginSendData;
    type: TransferPluginDataType;
    transfer?: Transferable[];
    cancel?: TransferPluginCancelPreparedDataFunction;
}

export interface ITransferPluginReceivedData {
    data: TransferPluginReceivedData;
    cancel?: TransferPluginCancelPreparedDataFunction;
}
