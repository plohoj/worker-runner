import { BaseConnectionStrategyClient, IPreparedForSendRunnerDataClient } from '../../../connection-strategies/base/base.connection-strategy-client';
import { DataForSendRunner } from "../../../connection-strategies/base/prepared-for-send-data";
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../../errors/error-message';
import { ConnectionClosedError, RunnerDestroyError } from '../../../errors/runner-errors';
import { RunnerEnvironmentClient, RunnerEnvironmentClientFactory } from '../../../runner-environment/client/runner-environment.client';
import { RunnerEnvironmentClientCollection } from '../../../runner-environment/client/runner-environment.client.collection';
import { ResolvedRunner } from '../../../runner/resolved-runner';
import { IRunnerDescription } from '../../../runner/runner-description';
import { RunnerController, RUNNER_ENVIRONMENT_CLIENT } from '../../../runner/runner.controller';
import { RunnerConstructor } from '../../../types/constructor';
import { RunnerToken } from '../../../types/runner-identifier';
import { ErrorCollector } from '../../../utils/error-collector';
import { PLUGIN_CANNOT_PROCESS_DATA } from "../../plugin-cannot-process-data";
import { ITransferPluginPreparedData, ITransferPluginReceivedData, TransferPluginReceivedData, TransferPluginSendData } from '../base/transfer-plugin-data';
import { ITransferPluginController, ITransferPluginControllerConfig, ITransferPluginControllerReceiveDataConfig, ITransferPluginControllerTransferDataConfig } from '../base/transfer.plugin-controller';
import { IRunnerTransferPluginData, RUNNER_TRANSFER_TYPE } from './runner-transfer-plugin-data';

export interface IRunnerTransferPluginControllerConfig {
    connectionStrategy: BaseConnectionStrategyClient;
}

export interface IRunnerTransferPluginControllerAdditionalConfig {
    runnerEnvironmentClientFactory: RunnerEnvironmentClientFactory;
}

export class RunnerTransferPluginController implements ITransferPluginController {
    private readonly environmentCollection = new RunnerEnvironmentClientCollection();
    private readonly connectionStrategy: BaseConnectionStrategyClient;
    private runnerDescription!: IRunnerDescription;
    private runnerEnvironmentClientFactory!: RunnerEnvironmentClientFactory;

    constructor(config: IRunnerTransferPluginControllerConfig) {
        this.connectionStrategy = config.connectionStrategy;
    }

    public registerPluginConfig(config: ITransferPluginControllerConfig): void {
        this.runnerDescription = config.runnerDescription;
    }

    public registerRunnerPluginConfig(config: IRunnerTransferPluginControllerAdditionalConfig): void {
        this.runnerEnvironmentClientFactory = config.runnerEnvironmentClientFactory;
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
                    runnerEnvironmentClient.runnerDescription.token,
                    preparedStrategyData,
                )
            );
        }
        return this.strategyDataToTransferData(
            runnerEnvironmentClient.runnerDescription.token,
            preparedStrategyData$,
        );
    }

    public cancelTransferData(
        config: ITransferPluginControllerTransferDataConfig,
    ): void | Promise<void> | typeof PLUGIN_CANNOT_PROCESS_DATA {
        if (!RunnerController.isRunnerController(config.data)) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }
        // Need to destroy the original Runner only if it was marked for transfer
        if (config.data[RUNNER_ENVIRONMENT_CLIENT].isMarkedForTransfer) {
            return config.data.disconnect();
        }
    }

    public async receiveData(
        config: ITransferPluginControllerReceiveDataConfig,
    ): Promise<ITransferPluginReceivedData> {
        const transferData = config.data satisfies TransferPluginSendData as unknown as IRunnerTransferPluginData;
        const connectionChannel = this.connectionStrategy.resolveConnectionForRunner(
            config.actionController.connectionChannel,
            transferData satisfies IRunnerTransferPluginData as unknown as DataForSendRunner,
        )
        const environmentClient: RunnerEnvironmentClient = await this.runnerEnvironmentClientFactory({
            token: transferData.token,
            connectionChannel,
        });
        environmentClient.destroyHandlerController.addHandler(
            () => this.environmentCollection.remove(environmentClient)
        );
        // While waiting for the turn of promises Runner could be destroyed.
        // Before adding a runner to the collection,
        // we check the fact that the runner was not destroyed.
        // If the check fails, a connection error will be thrown.
        if (!connectionChannel.isConnected) {
            throw new ConnectionClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED(environmentClient.runnerDescription),
            });
        }
        this.environmentCollection.add(environmentClient);
        const receivedData: ITransferPluginReceivedData = {
            data: environmentClient.resolvedRunner satisfies ResolvedRunner<RunnerConstructor> as unknown as TransferPluginReceivedData,
            cancel: () => environmentClient.disconnect(),
        }
        return receivedData;
    }

    public async cancelReceiveData(
        config: ITransferPluginControllerReceiveDataConfig,
    ): Promise<void> {
        const transferData = config.data satisfies TransferPluginSendData as unknown as IRunnerTransferPluginData;
        const connectionChannel = this.connectionStrategy.resolveConnectionForRunner(
            config.actionController.connectionChannel,
            transferData satisfies IRunnerTransferPluginData as unknown as DataForSendRunner,
        );
        await RunnerEnvironmentClient.disconnectConnection(connectionChannel);
        connectionChannel.destroy();
    }

    public destroy(): Promise<void> {
        return this.environmentCollection.disconnect(
            new ErrorCollector(originalErrors => new RunnerDestroyError({ 
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(this.runnerDescription),
                originalErrors,
            }))
        );
    }

    private strategyDataToTransferData(
        token: RunnerToken,
        preparedStrategyData: IPreparedForSendRunnerDataClient,
    ): ITransferPluginPreparedData {
        const transferData: IRunnerTransferPluginData = {
            token,
        };
        Object.assign(transferData, preparedStrategyData.data);
        const preparedForTransferData: ITransferPluginPreparedData = {
            data: transferData satisfies IRunnerTransferPluginData as unknown as TransferPluginSendData,
            type: RUNNER_TRANSFER_TYPE,
            transfer: preparedStrategyData.transfer,
            cancel: () => preparedStrategyData.cancel(),
        }
        return preparedForTransferData;
    }
}
