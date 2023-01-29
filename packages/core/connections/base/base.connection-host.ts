import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';

export interface IEstablishedConnectionHostData {
    connectionChannel: BaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyHost;
}

export type ConnectionHostHandler = (newConnection: IEstablishedConnectionHostData) => void; 

export interface IBaseConnectionHost {
    /**
     * Starts listening for new connections.
     * In the case of a new connection, makes a callback and passes the new connection
     * and the best communication strategy as an argument */
    startListen(handler: ConnectionHostHandler): void;
    stop?(): Promise<void> | void;
}
