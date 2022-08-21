import { WorkerRunnerError, WorkerRunnerErrorConstructor, WorkerRunnerMultipleError } from '../../../errors/worker-runner-error';
import { PLUGIN_CANNOT_PROCESS_DATA } from '../../plugin-cannot-process-data';
import { PluginsResolverHost } from '../../resolver/plugins.resolver.host';
import { ISerializedError, SerializedErrorType } from '../base/error-serialization-plugin-data';
import { IErrorSerializationPluginHost } from '../base/error-serialization.plugin.host';
import { ICoreCodeToErrorMap } from './core-error-code-map';
import { CoreErrorCodeMapSerializationPluginClient } from './core-error-code-map-serialization.plugin.client';

export interface ICoreErrorCodeMapSerializationPluginHostConfig {
    errorMap: ICoreCodeToErrorMap;
}

export class CoreErrorCodeMapSerializationPluginHost
    extends CoreErrorCodeMapSerializationPluginClient
    implements IErrorSerializationPluginHost
{
    private errorToCodeMap: Map<WorkerRunnerErrorConstructor, string>;
    protected override pluginResolver!: PluginsResolverHost;

    constructor(config: ICoreErrorCodeMapSerializationPluginHostConfig) {
        super(config);
        this.errorToCodeMap = this.convertErrorMapToErrorToCodeMap(config.errorMap);
    }

    public serializeError(error: unknown = {}): ISerializedError | typeof PLUGIN_CANNOT_PROCESS_DATA {
        const errorConstructor: WorkerRunnerErrorConstructor = Object.getPrototypeOf(error).constructor;
        const errorCode = this.errorToCodeMap.get(errorConstructor);
        if (!errorCode) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }

        const originalErrors: Array<ISerializedError> | undefined = (error as WorkerRunnerMultipleError).originalErrors
            ?.map(originalError => this.pluginResolver.serializeError(originalError) as ISerializedError)

        let serializedError: ISerializedError = {
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
