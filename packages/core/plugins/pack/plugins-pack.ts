import { IPlugin } from '../plugins';

export interface IPluginsPack {
    getPluginsPack(): IPlugin[];
}

export function isPluginsPack(pluginPack: unknown): pluginPack is IPluginsPack {
    return !!(pluginPack as IPluginsPack)?.getPluginsPack;
}
