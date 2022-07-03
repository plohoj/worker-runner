import { MessageEventConnectionChannel } from '../../connection-channels/message-event.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { fetchAndChooseBestStrategy } from '../../fetch-best-strategy/fetch-and-choose-best-strategy';
import { IMessageEventTarget } from '../../types/message-event-target.interface';
import { BaseConnectionHost, ConnectionHostHandler } from '../base/base.connection-host';

export interface IMessageEventConnectionHostConfig {
    target: IMessageEventTarget;
    strategies: BaseConnectionStrategyHost[],
}

export class MessageEventConnectionHost extends BaseConnectionHost {
    private readonly target: IMessageEventTarget;
    private readonly strategies: BaseConnectionStrategyHost[];

    constructor(config: IMessageEventConnectionHostConfig) {
        super();
        this.target = config.target;
        this.strategies = config.strategies;
    }

    public async startListen(handler: ConnectionHostHandler): Promise<void> {
        const connectionChannel = new MessageEventConnectionChannel({
            target: this.target,
        });
        // The ConnectionChannel running will be called  in the fetchAndChooseBestStrategy method
        const strategy = await fetchAndChooseBestStrategy({
            connectionChannel,
            availableStrategies: this.strategies,
            hasStrategyPriority: false,
            sendConnectAction: true,
        });
        handler({connectionChannel, strategy});
    }

    public stop(): void {
        // Nothing to do
    }
}
