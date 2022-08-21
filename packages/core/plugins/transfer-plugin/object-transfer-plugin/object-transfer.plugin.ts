import { ITransferPlugin } from '../base/transfer.plugin';
import { OBJECT_TRANSFER_TYPE } from './object-transfer-plugin-data';
import { ObjectTransferPluginController } from './object-transfer.plugin-controller';

export class ObjectTransferPlugin implements ITransferPlugin {
    public readonly type = OBJECT_TRANSFER_TYPE;

    public resolveTransferController(): ObjectTransferPluginController {
        return new ObjectTransferPluginController();
    }
}
