import { IPlugin } from '../plugins.type';
import { TransferPluginDataType } from './transfer-plugin-data';
import { ITransferPluginController } from './transfer.plugin-controller';

export interface ITransferPlugin {
    type: TransferPluginDataType;

    resolveTransferController(): ITransferPluginController;
}

export function isTransferPlugin(plugin: IPlugin): plugin is ITransferPlugin {
    return !!plugin.resolveTransferController && !!plugin.type;
}
