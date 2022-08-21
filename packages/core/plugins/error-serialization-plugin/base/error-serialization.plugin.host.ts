import { PLUGIN_CANNOT_PROCESS_DATA } from '../../plugin-cannot-process-data';
import { IPluginClient, IPluginHost } from '../../plugins.type';
import { PluginsResolverHost } from '../../resolver/plugins.resolver.host';
import { ISerializedError } from './error-serialization-plugin-data';
import { IErrorSerializationPluginClient } from './error-serialization.plugin.client';

export interface IErrorSerializationPluginHost extends IErrorSerializationPluginClient {
    serializeError(error: unknown): ISerializedError | typeof PLUGIN_CANNOT_PROCESS_DATA;
    registerPluginResolver?(pluginResolver: PluginsResolverHost): void;
}

export function isErrorSerializationPluginHost(
    plugin: IPluginHost | IPluginClient,
): plugin is IErrorSerializationPluginHost {
    return !!(plugin as IErrorSerializationPluginHost).serializeError;
}
