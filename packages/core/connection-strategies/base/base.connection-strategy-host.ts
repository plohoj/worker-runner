import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { RunnerEnvironmentHost } from '../../runner-environment/host/runner-environment.host';
import { RunnerConstructor } from '../../types/constructor';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { BaseConnectionStrategyClient, IPreparedForSendRunnerAttachData, IPreparedForSendRunnerData } from './base.connection-strategy-client';

export interface IPreparedForSendRunnerDataWithConnectionChannel extends IPreparedForSendRunnerData {
   connectionChannel: BaseConnectionChannel,
}

export abstract class BaseConnectionStrategyHost {
    public abstract readonly type: ConnectionStrategyEnum | string;
    public abstract readonly strategyClient: BaseConnectionStrategyClient;

    /**
     * Get the connection for the Runner that was passed as an argument.
     * Runner can be obtained after preparing the mark as transfer
     */
    public abstract resolveConnectionForRunnerAsArgument(
        preparedData: IPreparedForSendRunnerAttachData
    ): BaseConnectionChannel;

    /**
     * Preparing data to send a copied Runner as an argument.
     * Also prepares the {@link BaseConnectionChannel} to add an Action listener to the {@link RunnerEnvironmentHost}
     */
    public abstract prepareClonedRunnerForSend(
        environment: RunnerEnvironmentHost<RunnerConstructor>,
    ): IPreparedForSendRunnerDataWithConnectionChannel;

    /**
     * Preparing data to send a new Runner as an argument.
     * Also prepares the {@link BaseConnectionChannel} for use in the {@link RunnerEnvironmentHost}
     */
    public abstract prepareNewRunnerForSend(
        currentConnection: BaseConnectionChannel,
    ): IPreparedForSendRunnerDataWithConnectionChannel;
}
