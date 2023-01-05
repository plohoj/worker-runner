import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { BaseConnectionClient, IEstablishedConnectionClientData } from '../base/base.connection-client';

export interface PortalConnectionClientConfig {
    connectionChannel: BaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyClient;
}

export class PortalConnectionClient extends BaseConnectionClient {

    private readonly connectionChannel: BaseConnectionChannel;
    private readonly connectionStrategy: BaseConnectionStrategyClient;

    constructor(config: PortalConnectionClientConfig) {
        super();
        this.connectionChannel = config.connectionChannel;
        this.connectionStrategy = config.connectionStrategy;
    }

    public override connect(): IEstablishedConnectionClientData {
        return {
            connectionChannel: this.connectionChannel,
            connectionStrategy: this.connectionStrategy,
        }
    }
}
