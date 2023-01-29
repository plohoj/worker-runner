import { Nominal } from '../types/nominal';

declare const pluginCannotProcessData: unique symbol;
type PluginCannotProcessData = Nominal<typeof pluginCannotProcessData>;
/** A flag that means that this plugin cannot process data */
export const PLUGIN_CANNOT_PROCESS_DATA: PluginCannotProcessData = {
    symbol: 'PLUGIN_CANNOT_PROCESS_DATA',
} as unknown as PluginCannotProcessData;
