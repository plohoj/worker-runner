import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { BaseConnectionStrategyClient, IPreparedForSendRunnerData } from './base.connection-strategy-client';

export interface IPreparedForSendRunnerDataWithConnectionChannel extends IPreparedForSendRunnerData {
   connectionChannel: BaseConnectionChannel,
}

export abstract class BaseConnectionStrategyHost {
    public abstract readonly type: ConnectionStrategyEnum | string;
    public abstract readonly strategyClient: BaseConnectionStrategyClient;

    /**
     * Preparing data to send a copied or new Runner.
     * Also prepares the {@link BaseConnectionChannel} to add an Action listener to the {@link RunnerEnvironmentHost}
     */
    public abstract prepareRunnerForSend(
        currentChannel: BaseConnectionChannel,
    ): IPreparedForSendRunnerDataWithConnectionChannel;
}
