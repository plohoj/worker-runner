import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';

export interface IEstablishedConnectionClientData {
    connectionChannel: BaseConnectionChannel;
    strategy: BaseConnectionStrategyClient;
}

export abstract class BaseConnectionClient {
    /** Establishes a connection and returns the best strategy for communication */
    public abstract connect(): Promise<IEstablishedConnectionClientData> | IEstablishedConnectionClientData;
    public abstract stop(): Promise<void> | void;
}
