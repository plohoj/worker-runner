import { ITransferPlugin } from '../transfer-plugin/transfer.plugin';
import { DATA_TRANSFER_TYPE } from './data-transfer-plugin-data';
import { DataTransferPluginController } from './data-transfer.plugin-controller';

export class DataTransferPlugin implements ITransferPlugin {
    public readonly type = DATA_TRANSFER_TYPE;

    public resolveTransferController(): DataTransferPluginController {
        return new DataTransferPluginController();
    }
}
