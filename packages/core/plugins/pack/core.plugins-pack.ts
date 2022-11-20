import { CORE_ERROR_CODE_MAP } from '../../errors/core-error-code-map';
import { CoreErrorCodeMapSerializationPlugin } from '../error-serialization-plugin/core-error-code-map/core-error-code-map-serialization.plugin';
import { FallbackErrorSerializationPlugin } from '../error-serialization-plugin/fallback/fallback-error-serialization.plugin';
import { NATIVE_ERROR_CODE_MAP } from '../error-serialization-plugin/native/native-error-code-map';
import { NativeErrorSerializationPlugin } from '../error-serialization-plugin/native/native-error-serialization.plugin';
import { IPlugin } from '../plugins.type';
import { ArrayTransferPlugin } from '../transfer-plugin/array-transfer-plugin/array-transfer.plugin';
import { DataTransferPlugin } from '../transfer-plugin/data-transfer-plugin/data-transfer.plugin';
import { JsonTransferPlugin } from '../transfer-plugin/json-transfer-plugin/json-transfer.plugin';
import { ObjectTransferPlugin } from '../transfer-plugin/object-transfer-plugin/object-transfer.plugin';
import { IPluginsPack } from './plugins-pack';

export class CorePluginsPack implements IPluginsPack {
    public getPluginsPack(): IPlugin[] {
        return [
            new ArrayTransferPlugin(),
            new ObjectTransferPlugin(),
            new DataTransferPlugin(),
            new JsonTransferPlugin(),

            new CoreErrorCodeMapSerializationPlugin({
                errorMap: CORE_ERROR_CODE_MAP,
            }),
            new NativeErrorSerializationPlugin({
                errorMap: NATIVE_ERROR_CODE_MAP,
            }),
            new FallbackErrorSerializationPlugin(),
        ];
    }
}
