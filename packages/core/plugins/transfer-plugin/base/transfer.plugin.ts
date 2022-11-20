import { TransferPluginDataType } from './transfer-plugin-data';
import { ITransferPluginController } from './transfer.plugin-controller';

export interface ITransferPlugin {
    type: TransferPluginDataType;

    resolveTransferController(): ITransferPluginController;
}

export function isTransferPlugin(plugin: unknown): plugin is ITransferPlugin {
    return !!(plugin as ITransferPlugin)?.resolveTransferController && !!(plugin as ITransferPlugin).type;
}
