import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';

export interface IEstablishedConnectionClientData {
    connectionChannel: BaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyClient;
}

export interface IBaseConnectionClient {
    stop?(): Promise<void> | void;
    /** Establishes a connection and returns the best strategy for communication */
    connect(): Promise<IEstablishedConnectionClientData> | IEstablishedConnectionClientData;
}
