import { ITransferPlugin } from '../base/transfer.plugin';
import { ARRAY_TRANSFER_TYPE } from './array-transfer-plugin-data';
import { ArrayTransferPluginController } from './array-transfer.plugin-controller';

export class ArrayTransferPlugin implements ITransferPlugin {
    public readonly type = ARRAY_TRANSFER_TYPE;

    public resolveTransferController(): ArrayTransferPluginController {
        return new ArrayTransferPluginController();
    }
}
