import { IErrorSerializationPluginHost } from './error-serialization-plugin/base/error-serialization.plugin.host';
import { IErrorSerializationPluginClient } from './error-serialization-plugin/base/error-serialization.plugin.client';
import { ITransferPlugin } from './transfer-plugin/base/transfer.plugin';

export type IPluginClient = ITransferPlugin | IErrorSerializationPluginClient;
export type IPluginHost = ITransferPlugin | IErrorSerializationPluginHost;
