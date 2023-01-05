import { BestStrategyResolverHost } from '../../best-strategy-resolver/host/best-strategy-resolver.host';
import { MessageEventConnectionChannel } from '../../connection-channels/message-event.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { IMessageEventTarget } from '../../types/message-event-target.interface';
import { BaseConnectionHost, ConnectionHostHandler } from '../base/base.connection-host';

export interface IMessageEventConnectionHostConfig {
    target: IMessageEventTarget;
    strategies: BaseConnectionStrategyHost[],
}

export class MessageEventConnectionHost extends BaseConnectionHost {
    private readonly target: IMessageEventTarget;
    private readonly strategies: BaseConnectionStrategyHost[];
    private stopCallback?: () => void;

    constructor(config: IMessageEventConnectionHostConfig) {
        super();
        this.target = config.target;
        this.strategies = config.strategies;
    }

    public override startListen(handler: ConnectionHostHandler): void {
        const connectionChannel = new MessageEventConnectionChannel({
            target: this.target,
        });
        // The BaseConnectionChannel.run() will be called in the BestStrategyResolverHost.run() method
        const bestStrategyResolver = new BestStrategyResolverHost({
            connectionChannel,
            availableStrategies: this.strategies,
            sendPingAction: true,
        });
        bestStrategyResolver.run(
            strategy => handler({
                connectionChannel: new MessageEventConnectionChannel({
                    target: this.target,
                }),
                connectionStrategy: strategy,
            }),
            error => {
                throw error;
            },
        );
        this.stopCallback = () => {
            bestStrategyResolver.stop();
            this.stopCallback = undefined;
        }
    }

    public override stop(): void {
        this.stopCallback?.();
    }
}
