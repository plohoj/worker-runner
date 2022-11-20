import { WorkerRunnerCoreErrorCode } from '../../../errors/core-error-code';
import { ICoreCodeToErrorMap } from '../../../errors/core-error-code-map';
import { WorkerRunnerError, WorkerRunnerErrorConstructor, WorkerRunnerMultipleError } from '../../../errors/worker-runner-error';
import { PLUGIN_CANNOT_PROCESS_DATA } from '../../plugin-cannot-process-data';
import { DeserializedError, ISerializedError, SerializedErrorType } from '../base/error-serialization-plugin-data';
import { ErrorSerializationPluginsResolver } from '../base/error-serialization-plugins.resolver';
import { IErrorSerializationPlugin } from '../base/error-serialization.plugin';

export interface ICoreErrorCodeMapSerializationPluginConfig {
    errorMap: ICoreCodeToErrorMap;
}

export class CoreErrorCodeMapSerializationPlugin implements IErrorSerializationPlugin {
    private errorMap: ICoreCodeToErrorMap;
    private errorToCodeMap: Map<WorkerRunnerErrorConstructor, string>;
    private errorSerialization!: ErrorSerializationPluginsResolver;

    constructor(config: ICoreErrorCodeMapSerializationPluginConfig) {
        this.errorMap = config.errorMap;
        this.errorToCodeMap = this.convertErrorMapToErrorToCodeMap(config.errorMap);
    }

    public registerErrorSerialization(errorSerialization: ErrorSerializationPluginsResolver): void {
        this.errorSerialization = errorSerialization;
    }

    public deserializeError(serializedError: ISerializedError): DeserializedError | typeof PLUGIN_CANNOT_PROCESS_DATA {
        const errorConstructor = this.errorMap[serializedError.type as unknown as WorkerRunnerCoreErrorCode];
        if (!errorConstructor) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }
        return new errorConstructor({
            message: serializedError.message,
            stack: serializedError.stack,
            name: serializedError.name,
            originalErrors: serializedError.originalErrors
                ?.map(serializedOriginalError => this.errorSerialization
                    .deserializeError(serializedOriginalError)),
        }) as unknown as DeserializedError;
    }

    
    public serializeError(error: unknown = {}): ISerializedError | typeof PLUGIN_CANNOT_PROCESS_DATA {
        const errorConstructor: WorkerRunnerErrorConstructor
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            = Object.getPrototypeOf(error).constructor as WorkerRunnerErrorConstructor;
        const errorCode = this.errorToCodeMap.get(errorConstructor);
        if (!errorCode) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }

        const originalErrors: Array<ISerializedError> | undefined = (error as WorkerRunnerMultipleError).originalErrors
            ?.map(originalError => this.errorSerialization.serializeError(originalError))

        const serializedError: ISerializedError = {
            type: errorCode as SerializedErrorType,
            message: (error as WorkerRunnerError | WorkerRunnerMultipleError).message,
            stack: (error as WorkerRunnerError | WorkerRunnerMultipleError).stack,
            originalErrors,
        };

        return serializedError;
    }

    private convertErrorMapToErrorToCodeMap(
        errorMap: ICoreCodeToErrorMap,
    ): Map<WorkerRunnerErrorConstructor, string>{
        const errorToCodeMap = new Map<WorkerRunnerErrorConstructor, string>();
        for (const [code, errorConstructor] of Object.entries(errorMap)) {
            errorToCodeMap.set(errorConstructor, code);
        }
        return errorToCodeMap;
    }
}
