import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { IBaseConnectionClient, IEstablishedConnectionClientData } from '../base/base.connection-client';

export interface PortalConnectionClientConfig {
    connectionChannel: BaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyClient;
}

export class PortalConnectionClient implements IBaseConnectionClient {

    private readonly connectionChannel: BaseConnectionChannel;
    private readonly connectionStrategy: BaseConnectionStrategyClient;

    constructor(config: PortalConnectionClientConfig) {
        this.connectionChannel = config.connectionChannel;
        this.connectionStrategy = config.connectionStrategy;
    }

    public connect(): IEstablishedConnectionClientData {
        return {
            connectionChannel: this.connectionChannel,
            connectionStrategy: this.connectionStrategy,
        }
    }
}
