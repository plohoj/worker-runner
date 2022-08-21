import { ActionController } from '@worker-runner/core/action-controller/action-controller';
import { ITransferPluginPreparedData, ITransferPluginReceivedData, TransferPluginSendData } from './transfer-plugin-data';
import { PLUGIN_CANNOT_PROCESS_DATA } from "../../plugin-cannot-process-data";
import { TransferPluginsResolver } from './transfer-plugins.resolver';

export interface ITransferPluginControllerTransferDataConfig {
    data: unknown;
    actionController: ActionController;
}

export interface ITransferPluginControllerReceiveDataConfig {
    data: TransferPluginSendData;
    actionController: ActionController;
}

export interface ITransferPluginController {
    registerTransferPluginsResolver?(transferPluginsResolver: TransferPluginsResolver): void;

    transferData(
        config: ITransferPluginControllerTransferDataConfig,
    ): Promise<ITransferPluginPreparedData> | ITransferPluginPreparedData | typeof PLUGIN_CANNOT_PROCESS_DATA;

    cancelTransferData?(
        config: ITransferPluginControllerTransferDataConfig,
    ): void | Promise<void> | typeof PLUGIN_CANNOT_PROCESS_DATA;

    receiveData(
        config: ITransferPluginControllerReceiveDataConfig,
    ): Promise<ITransferPluginReceivedData> | ITransferPluginReceivedData | typeof PLUGIN_CANNOT_PROCESS_DATA;

    cancelReceiveData?(
        config: ITransferPluginControllerReceiveDataConfig,
    ): void | Promise<void>;
}
