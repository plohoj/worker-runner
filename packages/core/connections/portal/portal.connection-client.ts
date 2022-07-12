import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { RepeatConnectionStrategyClient } from '../../connection-strategies/repeat/repeat.connection-strategy-client';
import { BaseConnectionClient, IEstablishedConnectionClientData } from '../base/base.connection-client';

export interface PortalConnectionClientConfig {
    connectionChannel: BaseConnectionChannel;
}

export class PortalConnectionClient extends BaseConnectionClient {

    private connectionChannel: BaseConnectionChannel;

    constructor(config: PortalConnectionClientConfig) {
        super();
        this.connectionChannel = config.connectionChannel;
    }

    public connect(): IEstablishedConnectionClientData {
        return {
            connectionChannel: this.connectionChannel,
            // TODO MessagePortConnectionStrategy for LocalRunnerResolver
            strategy: new RepeatConnectionStrategyClient(),
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public stop(): void {}
}
