import { CoreErrorCodeMapSerializationPlugin, IPlugin, IPluginsPack } from '@worker-runner/core';
import { RX_ERROR_CODE_MAP } from '../errors/error-code-map';
import { RxTransferPlugin } from './transfer-plugin/rx-transfer.plugin';

export class RxWorkerRunnerPlugin implements IPluginsPack {
    public getPluginsPack(): IPlugin[] {
        return [
            new CoreErrorCodeMapSerializationPlugin({
                errorMap: RX_ERROR_CODE_MAP,
            }),
            new RxTransferPlugin(),
        ];
    }
}
