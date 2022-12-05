
import { PLUGIN_CANNOT_PROCESS_DATA } from '../../plugin-cannot-process-data';
import { DeserializedError, ISerializedError, SerializedErrorType } from '../base/error-serialization-plugin-data';
import { IErrorSerializationPlugin } from '../base/error-serialization.plugin';
import { INativeCodeToErrorMap } from './native-error-code-map';

export interface INativeErrorSerializationPluginConfig {
    errorMap: INativeCodeToErrorMap;
}

export class NativeErrorSerializationPlugin implements IErrorSerializationPlugin {
    private errorMap: INativeCodeToErrorMap;
    private errorToCodeMap: Map<typeof Error, string>;

    constructor(config: INativeErrorSerializationPluginConfig) {
        this.errorMap = config.errorMap;
        this.errorToCodeMap = this.convertErrorMapToErrorToCodeMap(config.errorMap);
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

    public serializeError(error: unknown = {}): ISerializedError | typeof PLUGIN_CANNOT_PROCESS_DATA {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const errorConstructor: typeof Error = Object.getPrototypeOf(error).constructor as typeof Error;
        const errorCode = this.errorToCodeMap.get(errorConstructor);
        if (!errorCode) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }

        const serializedError: ISerializedError = {
            type: errorCode as SerializedErrorType,
            message: (error as Error).message,
            name: (error as Error).name,
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
