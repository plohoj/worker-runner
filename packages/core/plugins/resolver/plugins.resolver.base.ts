import { ArrayTransferPlugin } from '../transfer-plugin/array-transfer-plugin/array-transfer.plugin';
import { DataTransferPlugin } from '../transfer-plugin/data-transfer-plugin/data-transfer.plugin';
import { JsonTransferPlugin } from '../transfer-plugin/json-transfer-plugin/json-transfer.plugin';
import { ObjectTransferPlugin } from '../transfer-plugin/object-transfer-plugin/object-transfer.plugin';
import { IPluginClient, IPluginHost } from '../plugins.type';
import { TransferPluginsResolver } from '../transfer-plugin/base/transfer-plugins.resolver';
import { isTransferPlugin, ITransferPlugin } from '../transfer-plugin/base/transfer.plugin';

export interface IPluginsResolverConfig {
    plugins: Array<IPluginClient | IPluginHost>;
}

export abstract class BasePluginsResolver {
    private readonly transferPlugins = new Array<ITransferPlugin>();

    constructor(config: IPluginsResolverConfig) {
        this.registerPlugins([
            ...config.plugins,
            new ArrayTransferPlugin(),
            new ObjectTransferPlugin(),
            new DataTransferPlugin(),
            new JsonTransferPlugin(),
        ]);
    }

    public resolveTransferResolver(): TransferPluginsResolver {
        return new TransferPluginsResolver({
            plugins: this.transferPlugins,
        });
    }

    protected registerPlugin(plugin: IPluginClient | IPluginHost) {
        if (isTransferPlugin(plugin)) {
            this.transferPlugins.push(plugin);
        }
    }

    protected registerPlugins(plugins: Array<IPluginClient | IPluginHost>): void {
        for (const plugin of plugins) {
            this.registerPlugin(plugin);
        }
    }
}
