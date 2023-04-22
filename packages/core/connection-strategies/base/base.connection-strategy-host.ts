import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { BaseConnectionStrategyClient } from './base.connection-strategy-client';
import { IPreparedForSendRunnerDataBase } from "./prepared-for-send-data";

export interface IPreparedForSendRunnerDataHost extends IPreparedForSendRunnerDataBase {
    connectionChannel: IBaseConnectionChannel,
}

export abstract class BaseConnectionStrategyHost {
    public abstract readonly type: ConnectionStrategyEnum | string;
    public abstract readonly strategyClient: BaseConnectionStrategyClient;

    /**
     * Preparing data to send a copied or new Runner.
     * Also prepares the {@link IBaseConnectionChannel} to add an Action listener to the {@link RunnerEnvironmentHost}
     */
    public abstract prepareRunnerForSend(
        currentChannel: IBaseConnectionChannel,
    ): IPreparedForSendRunnerDataHost;
}
