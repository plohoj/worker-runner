
import { PLUGIN_CANNOT_PROCESS_DATA } from '../../plugin-cannot-process-data';
import { DeserializedError, ISerializedError } from '../base/error-serialization-plugin-data';
import { IErrorSerializationPluginClient } from '../base/error-serialization.plugin.client';
import { INativeCodeToErrorMap } from './native-error-code-map';

export interface INativeErrorSerializationPluginClientClientConfig {
    errorMap: INativeCodeToErrorMap;
}

export class NativeErrorSerializationPluginClient implements IErrorSerializationPluginClient {
    private errorMap: INativeCodeToErrorMap;

    constructor(config: INativeErrorSerializationPluginClientClientConfig) {
        this.errorMap = config.errorMap;
    }

    public deserializeError(serializedError: ISerializedError): DeserializedError | typeof PLUGIN_CANNOT_PROCESS_DATA {
        const errorConstructor = this.errorMap[serializedError.type as string];
        if (!errorConstructor) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }
        const error = new errorConstructor(serializedError.message);
        error.stack = serializedError.stack;
        if (serializedError.name) {
            error.name = serializedError.name;
        }
        return error as unknown as DeserializedError;
    }
}
