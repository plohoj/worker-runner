import { WorkerRunnerUnexpectedError } from '../../../errors/worker-runner-error';
import { PLUGIN_CANNOT_PROCESS_DATA } from '../../plugin-cannot-process-data';
import { DeserializedError, ISerializedError } from './error-serialization-plugin-data';
import { IErrorSerializationPlugin } from './error-serialization.plugin';

export interface IErrorSerializationPluginsResolverConfig {
    plugins: IErrorSerializationPlugin[];
}

export class ErrorSerializationPluginsResolver implements IErrorSerializationPlugin {
    
    private readonly plugins = new Array<IErrorSerializationPlugin>();

    constructor(config: IErrorSerializationPluginsResolverConfig) {
        this.plugins = config.plugins;
        for (const plugin of this.plugins) {
            plugin.registerErrorSerialization?.(this);
        }
    }
    
    public serializeError(error: unknown): ISerializedError {
        for (const plugin of this.plugins) {
            const serializedError = plugin.serializeError(error);
            if (serializedError !== PLUGIN_CANNOT_PROCESS_DATA) {
                return serializedError as ISerializedError;
            }
        }
        throw new WorkerRunnerUnexpectedError({
            message: 'Failed to serialize error',
        });
    }

    public deserializeError(error: ISerializedError): DeserializedError {
        for (const plugin of this.plugins) {
            const deserializedError = plugin.deserializeError(error);
            if (deserializedError !== PLUGIN_CANNOT_PROCESS_DATA) {
                return deserializedError as DeserializedError;
            }
        }
        throw new WorkerRunnerUnexpectedError({
            message: 'Failed to deserialize error',
        });
    }
}
