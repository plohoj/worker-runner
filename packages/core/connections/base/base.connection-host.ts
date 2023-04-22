import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { IInterceptPlugin } from '../../plugins/intercept-plugin/intercept.plugin';

export interface IEstablishedConnectionHostData {
    connectionChannel: IBaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyHost;
}

export type ConnectionHostHandler = (newConnection: IEstablishedConnectionHostData) => void; 

export interface IBaseConnectionHost {
    registerPlugins?(interceptPlugins: IInterceptPlugin[]): void;
    /**
     * Starts listening for new connections.
     * In the case of a new connection, makes a callback and passes the new connection
     * and the best communication strategy as an argument */
    startListen(handler: ConnectionHostHandler): void;
    stop?(): Promise<void> | void;
}
