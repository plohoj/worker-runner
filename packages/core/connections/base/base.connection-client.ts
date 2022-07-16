import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';

export interface IEstablishedConnectionClientData {
    connectionChannel: BaseConnectionChannel;
    strategy: BaseConnectionStrategyClient;
}

export abstract class BaseConnectionClient {
    public stop?(): Promise<void> | void;
    /** Establishes a connection and returns the best strategy for communication */
    public abstract connect(): Promise<IEstablishedConnectionClientData> | IEstablishedConnectionClientData;
}
