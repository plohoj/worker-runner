import { ErrorSerializationPluginsResolver } from '../error-serialization-plugin/base/error-serialization-plugins.resolver';
import { IErrorSerializationPlugin, isErrorSerializationPlugin } from '../error-serialization-plugin/base/error-serialization.plugin';
import { CorePluginsPack } from '../pack/core.plugins-pack';
import { IPluginsPack, isPluginsPack } from '../pack/plugins-pack';
import { IPlugin } from '../plugins.type';
import { TransferPluginsResolver } from '../transfer-plugin/base/transfer-plugins.resolver';
import { isTransferPlugin, ITransferPlugin } from '../transfer-plugin/base/transfer.plugin';

export interface IPluginsResolverHostConfig {
    plugins: Array<IPlugin>;
}

export class PluginsResolver {
    public readonly errorSerialization: ErrorSerializationPluginsResolver; 

    private readonly transferPlugins = new Array<ITransferPlugin>();
    private readonly errorSerializationPlugins = new Array<IErrorSerializationPlugin>();

    constructor(config: IPluginsResolverHostConfig) {
        this.registerPlugins([...config.plugins, new CorePluginsPack()]);
        this.errorSerialization = new ErrorSerializationPluginsResolver({
            plugins: this.errorSerializationPlugins,
        });
    }

    public resolveTransferResolver(): TransferPluginsResolver {
        return new TransferPluginsResolver({
            plugins: this.transferPlugins,
            errorSerialization: this.errorSerialization,
        });
    }

    private registerPlugins(plugins: Array<IPlugin>): void {
        for (const plugin of plugins) {
            this.registerPlugin(plugin);
        }
    }

    private registerPlugin(plugin: IPlugin | IPluginsPack) {
        if (isTransferPlugin(plugin)) {
            this.transferPlugins.push(plugin);
        } else if (isErrorSerializationPlugin(plugin)) {
            this.errorSerializationPlugins.push(plugin);
        } else if (isPluginsPack(plugin)) {
            this.registerPlugins(plugin.getPluginsPack());
        }
    }
}
