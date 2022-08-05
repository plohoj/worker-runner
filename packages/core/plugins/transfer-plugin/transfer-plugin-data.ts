type PluginCannotTransferType = "FAKE_TYPE_FOR_PLUGIN_CANNOT_TRANSFER" | symbol;

/** A flag that means that this plugin cannot process the transmitted data */
export const PLUGIN_CANNOT_TRANSFER_DATA: PluginCannotTransferType = {} as PluginCannotTransferType;

export type TransferPluginDataType = "FAKE_TYPE_FOR_TRANSFER_PLUGIN_DATA_TYPE" | symbol;
export type TransferPluginSendData = "FAKE_TYPE_FOR_TRANSFER_PLUGIN_DATA_TYPE" | symbol;
export type TransferPluginReceivedData = "FAKE_TYPE_FOR_TRANSFER_PLUGIN_RECEIVED_DATA_TYPE" | symbol;

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
};
