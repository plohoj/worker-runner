import { ITransferPluginPreparedData, ITransferPluginReceivedData, TransferPluginReceivedData, TransferPluginSendData } from '../base/transfer-plugin-data';
import { ITransferPluginController, ITransferPluginControllerReceiveDataConfig, ITransferPluginControllerTransferDataConfig } from '../base/transfer.plugin-controller';
import { JSON_TRANSFER_TYPE } from './json-transfer-plugin-data';

export class JsonTransferPluginController implements ITransferPluginController {

    public transferData(
        config: ITransferPluginControllerTransferDataConfig
    ): ITransferPluginPreparedData {
        return {
            data: config.data as TransferPluginSendData,
            type: JSON_TRANSFER_TYPE,
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
