import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { ISerializedError } from '../error-serialization-plugin/base/error-serialization-plugin-data';
import { IErrorSerializationPluginHost, isErrorSerializationPluginHost } from '../error-serialization-plugin/base/error-serialization.plugin.host';
import { CORE_ERROR_CODE_MAP } from '../error-serialization-plugin/core-error-code-map/core-error-code-map';
import { CoreErrorCodeMapSerializationPluginHost } from '../error-serialization-plugin/core-error-code-map/core-error-code-map-serialization.plugin.host';
import { FallbackErrorSerializationPluginHost } from '../error-serialization-plugin/fallback/fallback-error-serialization.plugin.host';
import { NATIVE_ERROR_CODE_MAP } from '../error-serialization-plugin/native/native-error-code-map';
import { NativeErrorSerializationPluginHost } from '../error-serialization-plugin/native/native-error-serialization.plugin.host';
import { PLUGIN_CANNOT_PROCESS_DATA } from '../plugin-cannot-process-data';
import { IPluginClient, IPluginHost } from '../plugins.type';
import { PluginsResolverClient } from './plugins.resolver.client';

export interface IPluginsResolverHostConfig {
    plugins: Array<IPluginHost | IPluginClient>;
}

export class PluginsResolverHost extends PluginsResolverClient implements IErrorSerializationPluginHost {
    private errorSerializationPlugins!: Array<IErrorSerializationPluginHost>;

    constructor(config: IPluginsResolverHostConfig) {
        super(config);
        this.registerPlugins([
            new CoreErrorCodeMapSerializationPluginHost({
                errorMap: CORE_ERROR_CODE_MAP,
            }),
            new NativeErrorSerializationPluginHost({
                errorMap: NATIVE_ERROR_CODE_MAP,
            }),
            new FallbackErrorSerializationPluginHost(),
        ])
    }

    public serializeError(error: unknown): ISerializedError {
        for (const plugin of this.errorSerializationPlugins) {
            const serializedError = plugin.serializeError(error);
            if (serializedError !== PLUGIN_CANNOT_PROCESS_DATA) {
                return serializedError as unknown as ISerializedError;
            }
        }
        throw new WorkerRunnerUnexpectedError();
    }

    protected override registerPlugins(plugins: Array<IPluginClient | IPluginHost>): void {
        this.errorSerializationPlugins = [];
        super.registerPlugins(plugins);
    }

    protected override registerPlugin(plugin: IPluginHost | IPluginClient) {
        if (isErrorSerializationPluginHost(plugin)) {
            this.errorSerializationPlugins.push(plugin);
        } else {
            super.registerPlugin(plugin);
        }
    }
}
