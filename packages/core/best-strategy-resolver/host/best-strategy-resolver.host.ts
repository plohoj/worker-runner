import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { ConnectionStrategyEnum } from '../../connection-strategies/connection-strategy.enum';
import { WorkerRunnerCommonConnectionStrategyError } from '../../errors/worker-runner-error';
import { WorkerRunnerIdentifier } from '../../utils/identifier-generator';
import { isAction } from '../../utils/is-action';
import { IBestStrategyResolverClientConnectAction, BestStrategyResolverClientActions } from '../client/best-strategy-resolver.client.actions';
import { BestStrategyResolverHostActions, IBestStrategyResolverHostConnectedAction, IBestStrategyResolverHostPingAction } from "./best-strategy-resolver.host.actions";

export interface IBestStrategyResolverHostConfig {
    connectionChannel: BaseConnectionChannel;
    sendPingAction: boolean;
    availableStrategies: BaseConnectionStrategyHost[];
}

/**
 * Exchange of available strategies and determination of the best strategy.
 * The exchange uses the principle of ping-pong
 * 
 * **WARNING**: To get the best result of receiving a message through the {@link MessagePort},
 * running the {@link BaseConnectionChannel} will be called in {@link run} method
 */
export class BestStrategyResolverHost {
    private readonly connectionChannel: BaseConnectionChannel;
    private readonly sendPingAction: boolean;
    private readonly availableStrategies: BaseConnectionStrategyHost[];
    private readonly availableStrategiesTypes: Array<ConnectionStrategyEnum | string>;
    private stopCallback?: () => void;
    private lastConnectIdentifier?: WorkerRunnerIdentifier;

    constructor(config: IBestStrategyResolverHostConfig) {
        this.connectionChannel = config.connectionChannel;
        this.sendPingAction = config.sendPingAction;
        this.availableStrategies = config.availableStrategies;
        this.availableStrategiesTypes
            = this.availableStrategies.map(availableStrategy => availableStrategy.type)
    }

    public run(
        next: (bestStrategy: BaseConnectionStrategyHost) => void,
        error: (error: WorkerRunnerCommonConnectionStrategyError) => void
    ): void {
        let wasReceivedConnectAction = false;
        const handler = (action: unknown) => {
            if (!isAction<IBestStrategyResolverClientConnectAction>(action)) {
                return;
            }
            if (action.type !== BestStrategyResolverClientActions.CONNECT) {
                return;
            }
            if (this.lastConnectIdentifier === action.id) {
                // There may be a situation when the client:
                // 1) Sent a Connect action;
                // 2) Got the Ping action;
                // 3) Sent a duplicate Connect action;
                return;
            }

            wasReceivedConnectAction = true;
            this.lastConnectIdentifier = action.id;

            let bestStrategyEnum: ConnectionStrategyEnum | string | undefined;
            // The client has priority in choosing strategies
            for (const priorityStrategy of action.strategies) {
                if (this.availableStrategiesTypes.includes(priorityStrategy)) {
                    bestStrategyEnum = priorityStrategy;
                    break;
                }
            }
            const bestStrategy: BaseConnectionStrategyHost | undefined = this.availableStrategies
                .find(availableStrategy => availableStrategy.type === bestStrategyEnum);

            const connectedAction: IBestStrategyResolverHostConnectedAction = {
                type: BestStrategyResolverHostActions.CONNECTED,
                strategies: this.availableStrategiesTypes,
            };
            this.connectionChannel.sendAction(connectedAction);
            if (bestStrategy) {
                next(bestStrategy);
            } else {
                error(new WorkerRunnerCommonConnectionStrategyError());
            }
        }
        this.stopCallback = () => {
            this.connectionChannel.removeActionHandler(handler);
            this.stopCallback = undefined
        };
        this.connectionChannel.addActionHandler(handler);
        this.connectionChannel.run();
        if (!wasReceivedConnectAction && this.sendPingAction) {
            const pingAction: IBestStrategyResolverHostPingAction = {
                type: BestStrategyResolverHostActions.PING,
            };
            this.connectionChannel.sendAction(pingAction);
        }
    }

    public stop(): void {
        this.stopCallback?.();
    }
}
