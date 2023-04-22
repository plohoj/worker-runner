import { IErrorSerializationPlugin } from './error-serialization-plugin/base/error-serialization.plugin';
import { IInterceptPlugin } from './intercept-plugin/intercept.plugin';
import { IPluginsPack } from './pack/plugins-pack';
import { ITransferPlugin } from './transfer-plugin/base/transfer.plugin';

export type IPlugin = ITransferPlugin | IErrorSerializationPlugin | IPluginsPack | IInterceptPlugin;
