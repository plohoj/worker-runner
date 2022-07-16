import { BestStrategyResolverClient } from '../../best-strategy-resolver/client/best-strategy-resolver.client';
import { MessageEventConnectionChannel } from '../../connection-channels/message-event.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { IMessageEventTarget } from '../../types/message-event-target.interface';
import { IdentifierGenerator } from '../../utils/identifier-generator';
import { BaseConnectionClient, IEstablishedConnectionClientData } from '../base/base.connection-client';

export interface IMessageEventConnectionClientConfig {
    target: IMessageEventTarget;
    strategies: BaseConnectionStrategyClient[],
}

export class MessageEventConnectionClient extends BaseConnectionClient {
    private readonly target: IMessageEventTarget;
    private readonly strategies: BaseConnectionStrategyClient[];
    private readonly identifierGenerator = new IdentifierGenerator();
    private stopCallback?: () => void;

    constructor(config: IMessageEventConnectionClientConfig) {
        super();
        this.target = config.target;
        this.strategies = config.strategies;
    }

    public override async connect(): Promise<IEstablishedConnectionClientData> {
        const connectionChannel = new MessageEventConnectionChannel({
            target: this.target,
        });
        // The ConnectionChannel.run() will be called in the BestStrategyResolverClient.resolve() method
        const bestStrategyResolver = new BestStrategyResolverClient({
            connectionChannel,
            availableStrategies: this.strategies,
        });
        this.stopCallback = () => {
            bestStrategyResolver.stop();
            this.stopCallback = undefined;
        }
        let strategy: BaseConnectionStrategyClient;
        try {
            strategy = await bestStrategyResolver.resolve(this.identifierGenerator.generate());
        } finally {
            this.stopCallback = undefined;
        }
        strategy.run?.();
        return {connectionChannel, strategy};
    }

    public override stop(): void {
        this.stopCallback?.();
        this.stopCallback = undefined;
    }
}
