import { TransferRunnerData } from '../../../transfer-data/transfer-runner-data';
import { PLUGIN_CANNOT_PROCESS_DATA } from "../../plugin-cannot-process-data";
import { ITransferPluginPreparedData, ITransferPluginReceivedData, TransferPluginReceivedData, TransferPluginSendData } from '../base/transfer-plugin-data';
import { ITransferPluginController, ITransferPluginControllerReceiveDataConfig, ITransferPluginControllerTransferDataConfig } from '../base/transfer.plugin-controller';
import { DATA_TRANSFER_TYPE } from './data-transfer-plugin-data';

export class DataTransferPluginController implements ITransferPluginController {

    public transferData(
        config: ITransferPluginControllerTransferDataConfig
    ): ITransferPluginPreparedData | typeof PLUGIN_CANNOT_PROCESS_DATA {
        const wrappedData = config.data as TransferRunnerData
        if (!(wrappedData instanceof TransferRunnerData)) {
            return PLUGIN_CANNOT_PROCESS_DATA;
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
