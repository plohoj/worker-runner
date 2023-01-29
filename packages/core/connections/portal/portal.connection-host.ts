import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { IBaseConnectionHost, ConnectionHostHandler } from '../base/base.connection-host';

export interface PortalConnectionHostConfig {
    connectionChannel: BaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyHost;
}

export class PortalConnectionHost implements IBaseConnectionHost {

    private readonly connectionChannel: BaseConnectionChannel;
    private readonly connectionStrategy: BaseConnectionStrategyHost;

    constructor(config: PortalConnectionHostConfig) {
        this.connectionChannel = config.connectionChannel;
        this.connectionStrategy = config.connectionStrategy;
    }

    public startListen(handler: ConnectionHostHandler): void {
        handler({
            connectionChannel: this.connectionChannel,
            connectionStrategy: this.connectionStrategy,
        });
    }
}
