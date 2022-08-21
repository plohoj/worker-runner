import { PLUGIN_CANNOT_PROCESS_DATA } from '../../plugin-cannot-process-data';
import { IPluginClient } from '../../plugins.type';
import { PluginsResolverClient } from '../../resolver/plugins.resolver.client';
import { DeserializedError, ISerializedError } from './error-serialization-plugin-data';

export interface IErrorSerializationPluginClient {
    deserializeError(serializedError: ISerializedError): DeserializedError | typeof PLUGIN_CANNOT_PROCESS_DATA;
    registerPluginResolver?(pluginResolver: PluginsResolverClient): void;
}

export function isErrorSerializationPluginClient(plugin: IPluginClient): plugin is IErrorSerializationPluginClient {
    return !!(plugin as IErrorSerializationPluginClient).deserializeError;
}
