import { BaseConnectionStrategyClient, DataForSendRunner, IPreparedForSendRunnerData } from '@worker-runner/core/connection-strategies/base/base.connection-strategy-client';
import { RunnerEnvironmentClient, RunnerEnvironmentClientPartFactory } from '@worker-runner/core/runner-environment/client/runner-environment.client';
import { RunnerController, RUNNER_ENVIRONMENT_CLIENT } from '@worker-runner/core/runner/runner.controller';
import { RunnerToken } from '@worker-runner/core/types/runner-identifier';
import { ITransferPluginPreparedData, ITransferPluginReceivedData, TransferPluginReceivedData, TransferPluginSendData } from '../base/transfer-plugin-data';
import { PLUGIN_CANNOT_PROCESS_DATA } from "../../plugin-cannot-process-data";
import { ITransferPluginController, ITransferPluginControllerReceiveDataConfig, ITransferPluginControllerTransferDataConfig } from '../base/transfer.plugin-controller';
import { IRunnerTransferPluginData, RUNNER_TRANSFER_TYPE } from './runner-transfer-plugin-data';

export interface IRunnerTransferPlugin {
    connectionStrategy: BaseConnectionStrategyClient;
}

export class RunnerTransferPluginController implements ITransferPluginController {

    private readonly connectionStrategy: BaseConnectionStrategyClient;
    /** Assigned later outside of the constructor, to solve a circular dependency problem */
    private runnerEnvironmentClientPartFactory!: RunnerEnvironmentClientPartFactory;

    constructor(config: IRunnerTransferPlugin) {
        this.connectionStrategy = config.connectionStrategy;
    }

    public registerRunnerEnvironmentClientPartFactory(
        runnerEnvironmentClientPartFactory: RunnerEnvironmentClientPartFactory
    ): void {
        this.runnerEnvironmentClientPartFactory = runnerEnvironmentClientPartFactory
    }

    public transferData(
        config: ITransferPluginControllerTransferDataConfig
    ): Promise<ITransferPluginPreparedData> | ITransferPluginPreparedData | typeof PLUGIN_CANNOT_PROCESS_DATA {
        if (!RunnerController.isRunnerController(config.data)) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }
        const runnerEnvironmentClient = config.data[RUNNER_ENVIRONMENT_CLIENT];
        const preparedStrategyData$ = this.connectionStrategy
                .prepareRunnerForSend(config.actionController.connectionChannel, runnerEnvironmentClient);
        if (preparedStrategyData$ instanceof Promise) {
            return preparedStrategyData$.then(preparedStrategyData => 
                this.strategyDataToTransferData(
                    runnerEnvironmentClient.token,
                    preparedStrategyData,
                    this.connectionStrategy,
                )
            );
        }
        return this.strategyDataToTransferData(
            runnerEnvironmentClient.token,
            preparedStrategyData$,
            this.connectionStrategy,
        );
    }

    public cancelTransferData(
        config: ITransferPluginControllerTransferDataConfig,
    ): void | Promise<void> | typeof PLUGIN_CANNOT_PROCESS_DATA {
        if (!RunnerController.isRunnerController(config.data)) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }
        if (config.data[RUNNER_ENVIRONMENT_CLIENT].isMarkedForTransfer) {
            return config.data.disconnect();
        }
    }

    public async receiveData(
        config: ITransferPluginControllerReceiveDataConfig,
    ): Promise<ITransferPluginReceivedData> {
        const transferData = config.data as unknown as IRunnerTransferPluginData;
        const runnerEnvironment = await this.runnerEnvironmentClientPartFactory({
            token: transferData.token,
            connectionChannel: this.connectionStrategy.resolveConnectionForRunner(
                config.actionController.connectionChannel,
                transferData as unknown as DataForSendRunner,
            ),
        });
        const receivedData: ITransferPluginReceivedData = {
            data: runnerEnvironment.resolvedRunner as unknown as TransferPluginReceivedData,
            cancel: () => runnerEnvironment.disconnect(),
        }
        return receivedData;
    }

    public async cancelReceiveData(
        config: ITransferPluginControllerReceiveDataConfig,
    ): Promise<void> {
        const transferData = config.data as unknown as IRunnerTransferPluginData;
        const connectionChannel = this.connectionStrategy.resolveConnectionForRunner(
            config.actionController.connectionChannel,
            transferData as unknown as DataForSendRunner,
        );
        await RunnerEnvironmentClient.disconnectConnection(connectionChannel);
        connectionChannel.destroy();
    }

    private strategyDataToTransferData(
        token: RunnerToken,
        preparedStrategyData: IPreparedForSendRunnerData,
        connectionStrategyClient: BaseConnectionStrategyClient,
    ): ITransferPluginPreparedData {
        const transferData: IRunnerTransferPluginData = {
            token,
        };
        Object.assign(transferData, preparedStrategyData.data);
        const preparedForTransferData: ITransferPluginPreparedData = {
            data: transferData as unknown as TransferPluginSendData,
            type: RUNNER_TRANSFER_TYPE,
            transfer: preparedStrategyData.transfer,
            cancel: () => connectionStrategyClient.cancelSendAttachRunnerData(preparedStrategyData.data),
        }
        return preparedForTransferData;
    }
}
