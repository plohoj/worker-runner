import { ActionController } from '../../../action-controller/action-controller';
import { IRunnerDescription } from '../../../runner/runner-description';
import { ErrorSerializationPluginsResolver } from '../../error-serialization-plugin/base/error-serialization-plugins.resolver';
import { PLUGIN_CANNOT_PROCESS_DATA } from "../../plugin-cannot-process-data";
import { ITransferPluginPreparedData, ITransferPluginReceivedData, TransferPluginSendData } from './transfer-plugin-data';
import { TransferPluginsResolver } from './transfer-plugins.resolver';

export interface ITransferPluginControllerTransferDataConfig {
    data: unknown;
    actionController: ActionController;
}

export interface ITransferPluginControllerReceiveDataConfig {
    data: TransferPluginSendData;
    actionController: ActionController;
}

export interface ITransferPluginControllerConfig {
    transferPluginsResolver: TransferPluginsResolver;
    errorSerialization: ErrorSerializationPluginsResolver;
    runnerDescription: IRunnerDescription;
}

export interface ITransferPluginController {
    registerPluginConfig?(config: ITransferPluginControllerConfig): void;

    /** Serializing data to send */
    transferData(
        config: ITransferPluginControllerTransferDataConfig,
    ): Promise<ITransferPluginPreparedData> | ITransferPluginPreparedData | typeof PLUGIN_CANNOT_PROCESS_DATA;

    /**
     * During the execution of the method, the data was prepared by another environment.
     * But the connection for the current environment was closed.
     * Need to destroy data prepared in another environment
     */
    cancelTransferData?(
        config: ITransferPluginControllerTransferDataConfig,
    ): void | Promise<void> | typeof PLUGIN_CANNOT_PROCESS_DATA;

    /** Deserialization of received data */
    receiveData(
        config: ITransferPluginControllerReceiveDataConfig,
    ): Promise<ITransferPluginReceivedData> | ITransferPluginReceivedData | typeof PLUGIN_CANNOT_PROCESS_DATA;

    /**
     * The data has been received. But before processing the data at one of the stages, an error occurred.
     * The data has not yet been processed and it is necessary to cancel the processes associated with obtaining data
     */
    cancelReceiveData?(
        config: ITransferPluginControllerReceiveDataConfig,
    ): void | Promise<void>;

    /** 
     * Destroying the plugin right before the runner will destroyed.
     * During the destruction process, the plugin may destroy the stored data
     */
    destroy?(): Promise<void> | void;
}
