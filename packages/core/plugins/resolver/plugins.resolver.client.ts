import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { DeserializedError, ISerializedError } from '../error-serialization-plugin/base/error-serialization-plugin-data';
import { IErrorSerializationPluginClient, isErrorSerializationPluginClient } from '../error-serialization-plugin/base/error-serialization.plugin.client';
import { CORE_ERROR_CODE_MAP } from '../error-serialization-plugin/core-error-code-map/core-error-code-map';
import { CoreErrorCodeMapSerializationPluginClient } from '../error-serialization-plugin/core-error-code-map/core-error-code-map-serialization.plugin.client';
import { NATIVE_ERROR_CODE_MAP } from '../error-serialization-plugin/native/native-error-code-map';
import { NativeErrorSerializationPluginClient } from '../error-serialization-plugin/native/native-error-serialization.plugin.client';
import { PLUGIN_CANNOT_PROCESS_DATA } from '../plugin-cannot-process-data';
import { IPluginClient, IPluginHost } from '../plugins.type';
import { BasePluginsResolver } from './plugins.resolver.base';

export interface IPluginsResolverClientConfig {
    plugins: IPluginClient[];
}

export class PluginsResolverClient extends BasePluginsResolver implements IErrorSerializationPluginClient {
    private errorDeserializationPlugins!: Array<IErrorSerializationPluginClient>;

    constructor(config: IPluginsResolverClientConfig) {
        super({
            ...config,
            plugins: [
                ...config.plugins,
                new CoreErrorCodeMapSerializationPluginClient({
                    errorMap: CORE_ERROR_CODE_MAP,
                }),
                new NativeErrorSerializationPluginClient({
                    errorMap: NATIVE_ERROR_CODE_MAP,
                }),
            ]
        });
    }
    
    public deserializeError(error: ISerializedError): DeserializedError {
        for (const plugin of this.errorDeserializationPlugins) {
            const deserializedError = plugin.deserializeError(error);
            if (deserializedError !== PLUGIN_CANNOT_PROCESS_DATA) {
                return deserializedError as DeserializedError;
            }
        }
        throw new WorkerRunnerUnexpectedError();
    }

    protected override registerPlugins(plugins: Array<IPluginClient | IPluginHost>): void {
        this.errorDeserializationPlugins = [];
        super.registerPlugins(plugins);
    }

    protected override registerPlugin(plugin: IPluginClient) {
        if (isErrorSerializationPluginClient(plugin)) {
            this.errorDeserializationPlugins.push(plugin);
        } else {
            super.registerPlugin(plugin);
        }
    }
}
