import { TransferRunnerArray } from '../../transfer-data/transfer-runner-array';
import { TransferRunnerObject } from '../../transfer-data/transfer-runner-object';
import { TransferPluginDataType, TransferPluginReceivedData, TransferPluginSendData } from '../transfer-plugin/transfer-plugin-data';

export interface ICollectionTransferPluginFieldData {
    type: TransferPluginDataType;
    data: TransferPluginSendData;
}

export type CollectionTransferData = TransferRunnerObject | TransferRunnerArray;

export type ICollectionTransferPluginSendObjectData = Record<string | number, ICollectionTransferPluginFieldData>;
export type ICollectionTransferPluginSendArrayData = ICollectionTransferPluginFieldData[];
export type ICollectionTransferPluginSendData
    = ICollectionTransferPluginSendObjectData
    | ICollectionTransferPluginSendArrayData;

export type ICollectionTransferPluginReceivedObjectData = Record<string | number, TransferPluginReceivedData>;
export type ICollectionTransferPluginReceivedArrayData = TransferPluginReceivedData[];
export type ICollectionTransferPluginReceivedData
    = ICollectionTransferPluginReceivedObjectData
    | ICollectionTransferPluginReceivedArrayData;
