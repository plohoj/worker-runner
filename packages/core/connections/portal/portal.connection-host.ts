import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { BaseConnectionHost, ConnectionHostHandler } from '../base/base.connection-host';

export interface PortalConnectionHostConfig {
    connectionChannel: BaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyHost;
}

export class PortalConnectionHost extends BaseConnectionHost {

    private readonly connectionChannel: BaseConnectionChannel;
    private readonly connectionStrategy: BaseConnectionStrategyHost;

    constructor(config: PortalConnectionHostConfig) {
        super();
        this.connectionChannel = config.connectionChannel;
        this.connectionStrategy = config.connectionStrategy;
    }

    public override startListen(handler: ConnectionHostHandler): void {
        handler({
            connectionChannel: this.connectionChannel,
            connectionStrategy: this.connectionStrategy,
        });
    }
}
