import { ITransferPlugin } from '@worker-runner/core';
import { RX_TRANSFER_TYPE } from './rx-transfer-plugin-data';
import { RxTransferPluginController } from './rx-transfer.plugin-controller';

export class RxTransferPlugin implements ITransferPlugin {
    public readonly type = RX_TRANSFER_TYPE;

    public resolveTransferController(): RxTransferPluginController {
        return new RxTransferPluginController();
    }
}
