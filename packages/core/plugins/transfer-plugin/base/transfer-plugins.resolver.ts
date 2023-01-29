import { WORKER_RUNNER_ERROR_MESSAGES } from '../../../errors/error-message';
import { RunnerDataTransferError, RunnerDestroyError } from '../../../errors/runner-errors';
import { IRunnerDescription } from '../../../runner/runner-description';
import { ErrorCollector } from '../../../utils/error-collector';
import { parallelPromises } from '../../../utils/parallel-promises';
import { ErrorSerializationPluginsResolver } from '../../error-serialization-plugin/base/error-serialization-plugins.resolver';
import { PLUGIN_CANNOT_PROCESS_DATA } from "../../plugin-cannot-process-data";
import { RUNNER_TRANSFER_TYPE } from '../runner-transfer-plugin/runner-transfer-plugin-data';
import { IRunnerTransferPluginControllerAdditionalConfig, RunnerTransferPluginController } from '../runner-transfer-plugin/runner-transfer.plugin-controller';
import { ITransferPluginPreparedData, ITransferPluginReceivedData, TransferPluginDataType } from './transfer-plugin-data';
import { ITransferPlugin } from './transfer.plugin';
import { ITransferPluginController, ITransferPluginControllerReceiveDataConfig, ITransferPluginControllerTransferDataConfig } from './transfer.plugin-controller';

export interface ITransferPluginsResolverConfig extends IRunnerTransferPluginControllerAdditionalConfig {
    plugins: ITransferPlugin[];
    errorSerialization: ErrorSerializationPluginsResolver;
    runnerDescription: IRunnerDescription;
}

export interface ITransferPluginsResolverReceiveDataConfig extends ITransferPluginControllerReceiveDataConfig {
    type: TransferPluginDataType,
}

export class TransferPluginsResolver implements Omit<ITransferPluginController, 'type'> {
    private readonly pluginControllers = new Map<TransferPluginDataType, ITransferPluginController>();
    private readonly errorSerialization: ErrorSerializationPluginsResolver;
    private readonly runnerDescription: IRunnerDescription;

    constructor(config: ITransferPluginsResolverConfig) {
        this.errorSerialization = config.errorSerialization;
        this.runnerDescription = config.runnerDescription;
        this.registerPlugins(config.plugins);
        const runnerTransferPluginController
            = this.pluginControllers.get(RUNNER_TRANSFER_TYPE) as RunnerTransferPluginController;
        runnerTransferPluginController.registerRunnerPluginConfig(config);
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
            const {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                type,
                ...transferConfig
            } = config;
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
            const {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                type,
                ...transferConfig
            } = config;
            return pluginController.cancelReceiveData?.(transferConfig);
        }
    }

    public destroy(): Promise<void> {
        return parallelPromises({
            values: this.pluginControllers,
            mapper: ([, plugin]) => plugin.destroy?.(),
            stopAtFirstError: false,
            errorCollector: new ErrorCollector(originalErrors => new RunnerDestroyError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(this.runnerDescription),
                originalErrors,
            })),
        }) as Promise<unknown> as Promise<void>;
    }

    protected registerPlugins(plugins: ITransferPlugin[]): void {
        for (const plugin of plugins) {
            const pluginController = plugin.resolveTransferController();
            this.pluginControllers.set(plugin.type, pluginController);
            pluginController.registerPluginConfig?.({
                errorSerialization: this.errorSerialization,
                runnerDescription: this.runnerDescription,
                transferPluginsResolver: this,
            });
        }
    }
}
