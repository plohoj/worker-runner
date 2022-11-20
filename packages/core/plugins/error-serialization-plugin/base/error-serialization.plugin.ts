import { PLUGIN_CANNOT_PROCESS_DATA } from '../../plugin-cannot-process-data';
import { DeserializedError, ISerializedError } from './error-serialization-plugin-data';
import { ErrorSerializationPluginsResolver } from './error-serialization-plugins.resolver';

export interface IErrorSerializationPlugin {
    serializeError(error: unknown): ISerializedError | typeof PLUGIN_CANNOT_PROCESS_DATA;
    deserializeError(serializedError: ISerializedError): DeserializedError | typeof PLUGIN_CANNOT_PROCESS_DATA;
    registerErrorSerialization?(errorSerialization: ErrorSerializationPluginsResolver): void;
}

export function isErrorSerializationPlugin(plugin: unknown): plugin is IErrorSerializationPlugin {
    return !!(
        (plugin as IErrorSerializationPlugin)?.serializeError
        || (plugin as IErrorSerializationPlugin)?.deserializeError
    );
}
