import { TransferRunnerArray } from '../../transfer-data/transfer-runner-array';
import { ICollectionTransferPluginFieldData, ICollectionTransferPluginReceivedArrayData, ICollectionTransferPluginSendArrayData } from '../collection-transfer-plugin/collection-transfer-plugin-data';
import { BaseCollectionTransferPluginController } from '../collection-transfer-plugin/collection-transfer.plugin-controller';
import { TransferPluginReceivedData } from '../transfer-plugin/transfer-plugin-data';
import { ARRAY_TRANSFER_TYPE } from './array-transfer-plugin-data';

export class ArrayTransferPluginController extends BaseCollectionTransferPluginController<
    TransferRunnerArray,
    ICollectionTransferPluginSendArrayData,
    ICollectionTransferPluginReceivedArrayData
> {

    protected readonly type = ARRAY_TRANSFER_TYPE;

    protected isCollectionData(data: unknown): data is TransferRunnerArray {
        return data instanceof TransferRunnerArray;
    }

    protected getTransferDataEntries(data: TransferRunnerArray): Iterable<[number, unknown]> {
        return data.data.entries();
    }

    protected getTransferDataIterator(data: TransferRunnerArray): Iterable<unknown> {
        return data.data;
    }

    protected getTransferEmptyCollection(): ICollectionTransferPluginSendArrayData {
        return [];
    }

    protected setTransferCollectionData(
        collection: ICollectionTransferPluginSendArrayData,
        index: number,
        data: ICollectionTransferPluginFieldData,
    ): void {
        collection[index] = data;
    }

    protected getReceivedDataEntries(
        data: ICollectionTransferPluginSendArrayData,
    ): Iterable<[number, ICollectionTransferPluginFieldData]> {
        return data.entries();
    }

    protected getReceivedDataIterator(
        data: ICollectionTransferPluginSendArrayData,
    ): Iterable<ICollectionTransferPluginFieldData> {
        return data;
    }

    protected getReceivedEmptyCollection(): ICollectionTransferPluginReceivedArrayData {
        return [];
    }

    protected setReceivedCollectionData(
        collection: ICollectionTransferPluginReceivedArrayData,
        index: number,
        data: TransferPluginReceivedData,
    ): void {
        collection[index] = data;
    }
}
