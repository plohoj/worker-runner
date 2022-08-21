import { PLUGIN_CANNOT_PROCESS_DATA } from '../../plugin-cannot-process-data';
import { PluginsResolverClient } from '../../resolver/plugins.resolver.client';
import { DeserializedError, ISerializedError } from '../base/error-serialization-plugin-data';
import { IErrorSerializationPluginClient } from '../base/error-serialization.plugin.client';
import { WorkerRunnerCoreErrorCode } from './core-error-code';
import { ICoreCodeToErrorMap } from './core-error-code-map';


export interface ICoreErrorCodeMapSerializationPluginClientClientConfig {
    errorMap: ICoreCodeToErrorMap;
}

export class CoreErrorCodeMapSerializationPluginClient implements IErrorSerializationPluginClient {
    private errorMap: ICoreCodeToErrorMap;
    protected pluginResolver!: PluginsResolverClient;

    constructor(config: ICoreErrorCodeMapSerializationPluginClientClientConfig) {
        this.errorMap = config.errorMap;
    }

    public registerPluginResolver(pluginResolver: PluginsResolverClient): void {
        this.pluginResolver = pluginResolver;
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
                ?.map(serializedOriginalError => this.pluginResolver.deserializeError(serializedOriginalError)),
        }) as unknown as DeserializedError;
    }
}
