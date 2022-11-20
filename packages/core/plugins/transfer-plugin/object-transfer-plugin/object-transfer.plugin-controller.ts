import { TransferRunnerObject } from '../../../transfer-data/transfer-runner-object';
import { TransferPluginReceivedData } from '../base/transfer-plugin-data';
import { ICollectionTransferPluginFieldData, ICollectionTransferPluginReceivedObjectData, ICollectionTransferPluginSendObjectData } from '../collection-transfer-plugin/collection-transfer-plugin-data';
import { BaseCollectionTransferPluginController } from '../collection-transfer-plugin/collection-transfer.plugin-controller';
import { OBJECT_TRANSFER_TYPE } from './object-transfer-plugin-data';

export class ObjectTransferPluginController extends BaseCollectionTransferPluginController<
    TransferRunnerObject,
    ICollectionTransferPluginSendObjectData,
    ICollectionTransferPluginReceivedObjectData
> {

    protected readonly type = OBJECT_TRANSFER_TYPE;

    protected isCollectionData(data: unknown): data is TransferRunnerObject {
        return data instanceof TransferRunnerObject;
    }

    protected getTransferDataEntries(data: TransferRunnerObject): Iterable<[string, unknown]> {
        return Object.entries(data.data);
    }

    protected getTransferDataIterator(data: TransferRunnerObject): Iterable<unknown> {
        return Object.values(data.data);
    }

    protected getTransferEmptyCollection(): ICollectionTransferPluginSendObjectData {
        return {};
    }

    protected setTransferCollectionData(
        collection: ICollectionTransferPluginSendObjectData,
        field: string | number,
        data: ICollectionTransferPluginFieldData
    ): void {
        collection[field] = data;
    }

    protected getReceivedDataEntries(data: ICollectionTransferPluginSendObjectData): Iterable<[string | number, ICollectionTransferPluginFieldData]> {
        return Object.entries(data);
    }
    
    protected getReceivedDataIterator(data: ICollectionTransferPluginSendObjectData): Iterable<ICollectionTransferPluginFieldData> {
        return Object.values(data);
    }

    protected getReceivedEmptyCollection(): ICollectionTransferPluginReceivedObjectData {
        return {};
    }

    protected setReceivedCollectionData(
        collection: ICollectionTransferPluginReceivedObjectData,
        field: string | number,
        data: TransferPluginReceivedData,
    ): void {
        collection[field] = data;
    }
}
