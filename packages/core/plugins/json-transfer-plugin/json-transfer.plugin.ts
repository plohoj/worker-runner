import { ITransferPlugin } from '../transfer-plugin/transfer.plugin';
import { JSON_TRANSFER_TYPE } from './json-transfer-plugin-data';
import { JsonTransferPluginController } from './json-transfer.plugin-controller';

export class JsonTransferPlugin implements ITransferPlugin {
    public readonly type = JSON_TRANSFER_TYPE;

    public resolveTransferController(): JsonTransferPluginController {
        return new JsonTransferPluginController();
    }
}
