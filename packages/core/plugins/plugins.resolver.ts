import { ArrayTransferPlugin } from './array-transfer-plugin/array-transfer.plugin';
import { DataTransferPlugin } from './data-transfer-plugin/data-transfer.plugin';
import { JsonTransferPlugin } from './json-transfer-plugin/json-transfer.plugin';
import { ObjectTransferPlugin } from './object-transfer-plugin/object-transfer.plugin';
import { IPlugin } from './plugins.type';
import { TransferPluginsResolver } from './transfer-plugin/transfer-plugins.resolver';
import { isTransferPlugin, ITransferPlugin } from './transfer-plugin/transfer.plugin';

export interface IPluginsResolverConfig {
    plugins: IPlugin[];
}

export class PluginsResolver {
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

    private registerPlugins(plugins: IPlugin[]): void {
        for (const plugin of plugins) {
            if (isTransferPlugin(plugin)) {
                this.transferPlugins.push(plugin);
            }
        }
    }
}
