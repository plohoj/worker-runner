export type TransferPluginDataType = "FAKE_TYPE_FOR_TRANSFER_PLUGIN_DATA_TYPE" | symbol;
export type TransferPluginSendData = "FAKE_TYPE_FOR_TRANSFER_PLUGIN_DATA" | symbol;
export type TransferPluginReceivedData = "FAKE_TYPE_FOR_TRANSFER_PLUGIN_RECEIVED_DATA" | symbol;

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
