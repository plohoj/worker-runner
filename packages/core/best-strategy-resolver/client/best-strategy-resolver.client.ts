import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { ConnectionClosedError } from '../../errors/runner-errors';
import { WorkerRunnerCommonConnectionStrategyError } from '../../errors/worker-runner-error';
import { WorkerRunnerIdentifier } from '../../utils/identifier-generator';
import { isAction } from '../../utils/is-action';
import { BestStrategyResolverHostActions, IBestStrategyResolverHostAction } from '../host/best-strategy-resolver.host.actions';
import { BestStrategyResolverClientActions, IBestStrategyResolverClientConnectAction } from './best-strategy-resolver.client.actions';

export interface IBestStrategyResolverHostConfig {
    connectionChannel: BaseConnectionChannel;
    availableStrategies: BaseConnectionStrategyClient[];
}

/**
 * Exchange of available strategies and determination of the best strategy.
 * The exchange uses the principle of ping-pong
 * 
 * **WARNING**: To get the best result of receiving a message through the {@link MessagePort},
 * running the {@link BaseConnectionChannel} will be called in {@link resolve} method
 */
export class BestStrategyResolverClient {
    private readonly connectionChannel: BaseConnectionChannel;
    private readonly availableStrategies: BaseConnectionStrategyClient[];
    private rejectCallback?: () => void;

    constructor(config: IBestStrategyResolverHostConfig) {
        this.connectionChannel = config.connectionChannel;
        this.availableStrategies = config.availableStrategies;
    }

    /**
     * Stops listening for actions when the best strategy is selected
     * or an error occurs when choosing the best strategy
     */
    public resolve(connectId: WorkerRunnerIdentifier): Promise<BaseConnectionStrategyClient> {
        return new Promise<BaseConnectionStrategyClient>((resolve, reject) => {
            // eslint-disable-next-line prefer-const
            let stopCallback: () => void;
            const handler = (action: unknown) => {
                if (!isAction<IBestStrategyResolverHostAction>(action)) {
                    return;
                }
                if (action.type === BestStrategyResolverHostActions.PING) {
                    this.sendConnectAction(connectId);
                    return;
                }
                if (action.type !== BestStrategyResolverHostActions.CONNECTED) {
                    return;
                }
    
                stopCallback();
                
                let bestStrategy: BaseConnectionStrategyClient | undefined;
                // The client has priority in choosing strategies
                for (const clientStrategy of this.availableStrategies) {
                    if (action.strategies.includes(clientStrategy.type)) {
                        bestStrategy = clientStrategy;
                        break;
                    }
                }
    
                if (bestStrategy) {
                    resolve(bestStrategy);
                } else {
                    reject(new WorkerRunnerCommonConnectionStrategyError());
                }
            }
            stopCallback = () => {
                this.connectionChannel.removeActionHandler(handler);
                this.rejectCallback = undefined
            };
            this.rejectCallback = () => {
                stopCallback();
                reject(new ConnectionClosedError());
            };
            this.connectionChannel.addActionHandler(handler);
            this.connectionChannel.run();
            this.sendConnectAction(connectId);
        });
    }

    public stop(): void {
        this.rejectCallback?.();
    }

    private sendConnectAction(connectId: WorkerRunnerIdentifier) {
        const connectAction: IBestStrategyResolverClientConnectAction = {
            type: BestStrategyResolverClientActions.CONNECT,
            id: connectId,
            strategies: this.availableStrategies.map(strategy => strategy.type),
        };
        this.connectionChannel.sendAction(connectAction);
    }
}
