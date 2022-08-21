import { BaseConnectionStrategyClient } from '@worker-runner/core/connection-strategies/base/base.connection-strategy-client';
import { RunnerEnvironmentClientPartFactory } from '@worker-runner/core/runner-environment/client/runner-environment.client';
import { ITransferPlugin } from '../base/transfer.plugin';
import { RUNNER_TRANSFER_TYPE } from './runner-transfer-plugin-data';
import { RunnerTransferPluginController } from './runner-transfer.plugin-controller';

export interface IRunnerTransferPluginConfig {
    connectionStrategy: BaseConnectionStrategyClient;
}

export interface IRunnerTransferPluginResolveControllerConfig {
    runnerEnvironmentClientPartFactory: RunnerEnvironmentClientPartFactory;
}

export class RunnerTransferPlugin implements ITransferPlugin {
    
    public readonly type = RUNNER_TRANSFER_TYPE;

    private readonly connectionStrategy: BaseConnectionStrategyClient;

    constructor(config: IRunnerTransferPluginConfig) {
        this.connectionStrategy = config.connectionStrategy;
    }

    public resolveTransferController(): RunnerTransferPluginController {
        return new RunnerTransferPluginController({
            connectionStrategy: this.connectionStrategy,
        });
    }
}
