import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { RepeatConnectionStrategyHost } from '../../connection-strategies/repeat/repeat.connection-strategy-host';
import { BaseConnectionHost, ConnectionHostHandler } from '../base/base.connection-host';

export interface PortalConnectionHostConfig {
    connectionChannel: BaseConnectionChannel;
}

export class PortalConnectionHost extends BaseConnectionHost {

    private connectionChannel: BaseConnectionChannel;

    constructor(config: PortalConnectionHostConfig) {
        super();
        this.connectionChannel = config.connectionChannel;
    }

    public startListen(handler: ConnectionHostHandler): void {
        handler({
            connectionChannel: this.connectionChannel,
            strategy: new RepeatConnectionStrategyHost(),
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public stop(): void {}
}
