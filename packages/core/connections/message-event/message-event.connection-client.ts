import { MessageEventConnectionChannel } from '../../connection-channels/message-event.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { fetchAndChooseBestStrategy } from '../../fetch-best-strategy/fetch-and-choose-best-strategy';
import { IMessageEventTarget } from '../../types/message-event-target.interface';
import { BaseConnectionClient, IEstablishedConnectionClientData } from '../base/base.connection-client';

export interface IMessageEventConnectionClientConfig {
    target: IMessageEventTarget;
    strategies: BaseConnectionStrategyClient[],
}

export class MessageEventConnectionClient extends BaseConnectionClient {
    private readonly target: IMessageEventTarget;
    private readonly strategies: BaseConnectionStrategyClient[];

    constructor(config: IMessageEventConnectionClientConfig) {
        super();
        this.target = config.target;
        this.strategies = config.strategies;
    }

    public async connect(): Promise<IEstablishedConnectionClientData> {
        const connectionChannel = new MessageEventConnectionChannel({
            target: this.target,
        });
        // The ConnectionChannel running will be called  in the fetchAndChooseBestStrategy method
        const strategy = await fetchAndChooseBestStrategy({
            connectionChannel,
            availableStrategies: this.strategies,
            hasStrategyPriority: true,
            sendConnectAction: true,
        });
        return {connectionChannel, strategy};
    }

    public stop(): void {
        // Nothing to do
    }
}
