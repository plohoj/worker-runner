import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { IInterceptPlugin } from '../../plugins/intercept-plugin/intercept.plugin';

export interface IEstablishedConnectionClientData {
    connectionChannel: IBaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyClient;
}

export interface IBaseConnectionClient {
    registerPlugins?(interceptPlugins: IInterceptPlugin[]): void;
    /** Establishes a connection and returns the best strategy for communication */
    connect(): Promise<IEstablishedConnectionClientData> | IEstablishedConnectionClientData;
    stop?(): Promise<void> | void;
}
