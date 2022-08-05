import { TransferRunnerData } from '../../transfer-data/transfer-runner-data';
import { ITransferPluginPreparedData, ITransferPluginReceivedData, PLUGIN_CANNOT_TRANSFER_DATA, TransferPluginReceivedData, TransferPluginSendData } from '../transfer-plugin/transfer-plugin-data';
import { ITransferPluginController, ITransferPluginControllerReceiveDataConfig, ITransferPluginControllerTransferDataConfig } from '../transfer-plugin/transfer.plugin-controller';
import { DATA_TRANSFER_TYPE } from './data-transfer-plugin-data';

export class DataTransferPluginController implements ITransferPluginController {

    public transferData(
        config: ITransferPluginControllerTransferDataConfig
    ): ITransferPluginPreparedData | typeof PLUGIN_CANNOT_TRANSFER_DATA {
        const wrappedData = config.data as unknown as TransferRunnerData
        if (!(wrappedData instanceof TransferRunnerData)) {
            return PLUGIN_CANNOT_TRANSFER_DATA;
        }
        return {
            data: wrappedData.data as TransferPluginSendData,
            type: DATA_TRANSFER_TYPE,
            transfer: wrappedData.transfer,
        };
    }

    public receiveData(
        config: ITransferPluginControllerReceiveDataConfig,
    ): ITransferPluginReceivedData {
        return {
            data: config.data as TransferPluginReceivedData,
        };
    }
}
