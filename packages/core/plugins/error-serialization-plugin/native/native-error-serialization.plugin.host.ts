import { PLUGIN_CANNOT_PROCESS_DATA } from '../../plugin-cannot-process-data';
import { ISerializedError, SerializedErrorType } from '../base/error-serialization-plugin-data';
import { IErrorSerializationPluginHost } from '../base/error-serialization.plugin.host';
import { INativeCodeToErrorMap } from './native-error-code-map';
import { NativeErrorSerializationPluginClient } from './native-error-serialization.plugin.client';

export interface INativeErrorSerializationPluginHostConfig {
    errorMap: INativeCodeToErrorMap;
}

export class NativeErrorSerializationPluginHost
    extends NativeErrorSerializationPluginClient
    implements IErrorSerializationPluginHost
{
    private errorToCodeMap: Map<typeof Error, string>;

    constructor(config: INativeErrorSerializationPluginHostConfig) {
        super(config);
        this.errorToCodeMap = this.convertErrorMapToErrorToCodeMap(config.errorMap);
    }

    public serializeError(error: unknown = {}): ISerializedError | typeof PLUGIN_CANNOT_PROCESS_DATA {
        const errorConstructor: typeof Error = Object.getPrototypeOf(error).constructor;
        const errorCode = this.errorToCodeMap.get(errorConstructor);
        if (!errorCode) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }

        let serializedError: ISerializedError = {
            type: errorCode as SerializedErrorType,
            message: (error as Error).message,
            stack: (error as Error).stack,
        };

        return serializedError;
    }

    private convertErrorMapToErrorToCodeMap(
        errorMap: INativeCodeToErrorMap,
    ): Map<typeof Error, string>{
        const errorToCodeMap = new Map<typeof Error, string>();
        for (const [code, errorConstructor] of Object.entries(errorMap)) {
            errorToCodeMap.set(errorConstructor, code);
        }
        return errorToCodeMap;
    }
}
