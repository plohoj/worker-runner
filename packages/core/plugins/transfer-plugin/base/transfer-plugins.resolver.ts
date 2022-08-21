import { WORKER_RUNNER_ERROR_MESSAGES } from '../../../errors/error-message';
import { RunnerDataTransferError } from '../../../errors/runner-errors';
import { RunnerEnvironmentClientPartFactory } from '../../../runner-environment/client/runner-environment.client';
import { RUNNER_TRANSFER_TYPE } from '../runner-transfer-plugin/runner-transfer-plugin-data';
import { RunnerTransferPluginController } from '../runner-transfer-plugin/runner-transfer.plugin-controller';
import { ITransferPluginPreparedData, ITransferPluginReceivedData, TransferPluginDataType } from './transfer-plugin-data';
import { PLUGIN_CANNOT_PROCESS_DATA } from "../../plugin-cannot-process-data";
import { ITransferPlugin } from './transfer.plugin';
import { ITransferPluginController, ITransferPluginControllerReceiveDataConfig, ITransferPluginControllerTransferDataConfig } from './transfer.plugin-controller';

export interface ITransferPluginsResolverConfig {
    plugins: ITransferPlugin[];
}

export interface ITransferPluginsResolverReceiveDataConfig extends ITransferPluginControllerReceiveDataConfig {
    type: TransferPluginDataType,
}

export class TransferPluginsResolver implements Omit<ITransferPluginController, 'type'> {
    private readonly pluginControllers = new Map<TransferPluginDataType, ITransferPluginController>();

    constructor(config: ITransferPluginsResolverConfig) {
        this.registerPlugins(config.plugins);
    }

    public transferData(
        config: ITransferPluginControllerTransferDataConfig,
    ): Promise<ITransferPluginPreparedData> | ITransferPluginPreparedData {
        for (const pluginController of this.pluginControllers.values()) {
            const transferData = pluginController.transferData(config);
            if (transferData !== PLUGIN_CANNOT_PROCESS_DATA) {
                return transferData as Promise<ITransferPluginPreparedData> | ITransferPluginPreparedData;
            }
        }
        throw new RunnerDataTransferError({
            message: WORKER_RUNNER_ERROR_MESSAGES.DATA_TRANSFER_UNEXPECTED_TYPE_ERROR()
        });
    }

    public cancelTransferData(
        config: ITransferPluginControllerTransferDataConfig,
    ): void | Promise<void> {
        for (const pluginController of this.pluginControllers.values()) {
            if (pluginController.cancelTransferData) {
                const cancelResult = pluginController.cancelTransferData(config);
                if (cancelResult !== PLUGIN_CANNOT_PROCESS_DATA) {
                    return cancelResult as void | Promise<void>;
                }
            }
        }
    }

    public receiveData(
        config: ITransferPluginsResolverReceiveDataConfig,
    ): Promise<ITransferPluginReceivedData> | ITransferPluginReceivedData {
        const pluginController = this.pluginControllers.get(config.type);
        if (pluginController) {
            const {type, ...transferConfig } = config;
            const receivedData = pluginController.receiveData(transferConfig);
            if (receivedData !== PLUGIN_CANNOT_PROCESS_DATA) {
                return receivedData as Promise<ITransferPluginReceivedData> | ITransferPluginReceivedData;
            }
        }
        throw new RunnerDataTransferError({
            message: WORKER_RUNNER_ERROR_MESSAGES.DATA_TRANSFER_UNEXPECTED_TYPE_ERROR()
        });
    }

    public cancelReceiveData(
        config: ITransferPluginsResolverReceiveDataConfig,
    ): void | Promise<void> {
        const pluginController = this.pluginControllers.get(config.type);
        if (pluginController) {
            const {type, ...transferConfig } = config;
            return pluginController.cancelReceiveData?.(transferConfig);
        }
    }

    public registerRunnerEnvironmentClientPartFactory(
        runnerEnvironmentClientPartFactory: RunnerEnvironmentClientPartFactory,
    ): void {
        const runnerTransferPluginController
            = this.pluginControllers.get(RUNNER_TRANSFER_TYPE) as RunnerTransferPluginController;
        runnerTransferPluginController.registerRunnerEnvironmentClientPartFactory(runnerEnvironmentClientPartFactory);
    }

    protected registerPlugins(plugins: ITransferPlugin[]): void {
        for (const plugin of plugins) {
            const pluginController = plugin.resolveTransferController();
            this.pluginControllers.set(plugin.type, pluginController);
            pluginController.registerTransferPluginsResolver?.(this);
        }
    }
}
