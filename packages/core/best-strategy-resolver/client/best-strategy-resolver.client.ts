import { IConnectionChannelInterceptor } from '../../connection-channel-interceptor/connection-channel-interceptor';
import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { ConnectionClosedError } from '../../errors/runner-errors';
import { WorkerRunnerCommonConnectionStrategyError } from '../../errors/worker-runner-error';
import { IInterceptPlugin } from '../../plugins/intercept-plugin/intercept.plugin';
import { isAction } from '../../utils/is-action';
import { BestStrategyResolverHostActions, IBestStrategyResolverHostAction } from '../host/best-strategy-resolver.host.actions';
import { BestStrategyResolverClientActions, IBestStrategyResolverClientConnectAction } from './best-strategy-resolver.client.actions';

export interface IBestStrategyResolverClientConfig {
    connectionChannel: IBaseConnectionChannel;
    availableConnectionStrategies: BaseConnectionStrategyClient[];
    interceptPlugins: IInterceptPlugin[];
}

export interface IBestStrategyResolverClientResolvedConnection {
    connectionStrategy: BaseConnectionStrategyClient;
    connectionChannelInterceptors: IConnectionChannelInterceptor[];
}

/**
 * Exchange of available strategies and determination of the best strategy.
 * The exchange uses the principle of ping-pong
 * 
 * **WARNING**: To get the best result of receiving a message through the {@link MessagePort},
 * running the {@link IBaseConnectionChannel} will be called in {@link resolve} method
 */
export class BestStrategyResolverClient {
    private readonly connectionChannel: IBaseConnectionChannel;
    private readonly availableConnectionStrategies: BaseConnectionStrategyClient[];
    private readonly interceptPlugins: IInterceptPlugin[];
    private rejectCallback?: () => void;

    constructor(config: IBestStrategyResolverClientConfig) {
        this.connectionChannel = config.connectionChannel;
        this.availableConnectionStrategies = config.availableConnectionStrategies;
        this.interceptPlugins = config.interceptPlugins;
    }

    /**
     * Starting to establish a connection and finding the best strategy.
     * Stops listening for actions when the best strategy is selected
     * or an error occurs when choosing the best strategy
     */
    public resolve(): Promise<IBestStrategyResolverClientResolvedConnection> {
        return new Promise<IBestStrategyResolverClientResolvedConnection>((resolve, reject) => {
            // eslint-disable-next-line prefer-const
            let stopCallback: () => void;
            const handler = (action: unknown) => {
                if (!isAction<IBestStrategyResolverHostAction>(action)) {
                    return;
                }
                if (action.type === BestStrategyResolverHostActions.Ping) {
                    this.sendConnectAction();
                    return;
                }
                if (action.type !== BestStrategyResolverHostActions.Connected) {
                    return;
                }

                stopCallback();

                let bestStrategy: BaseConnectionStrategyClient | undefined;
                // The client has priority in choosing strategies
                for (const clientStrategy of this.availableConnectionStrategies) {
                    if (action.strategies.includes(clientStrategy.type)) {
                        bestStrategy = clientStrategy;
                        break;
                    }
                }
    
                if (bestStrategy) {
                    resolve({
                        connectionStrategy: bestStrategy,
                        connectionChannelInterceptors: this.interceptPlugins
                            .map(plugin => plugin.getInterceptorAfterConnect?.({type: BestStrategyResolverHostActions.Connected}))
                            // eslint-disable-next-line unicorn/no-array-callback-reference
                            .filter(Boolean as unknown as (interceptor: IConnectionChannelInterceptor | undefined) =>
                                interceptor is IConnectionChannelInterceptor
                            ),
                    });
                } else {
                    reject(new WorkerRunnerCommonConnectionStrategyError());
                }
            }
            stopCallback = () => {
                this.connectionChannel.actionHandlerController.removeHandler(handler);
                this.rejectCallback = undefined
            };
            this.rejectCallback = () => {
                stopCallback();
                reject(new ConnectionClosedError());
            };
            this.connectionChannel.interceptorsComposer.addInterceptors(
                ...this.interceptPlugins
                    .map(plugin => plugin.getInterceptorBeforeConnect?.())
                    // eslint-disable-next-line unicorn/no-array-callback-reference
                    .filter(Boolean as unknown as (interceptor: IConnectionChannelInterceptor | undefined) =>
                        interceptor is IConnectionChannelInterceptor
                    )
            );
            this.connectionChannel.actionHandlerController.addHandler(handler);
            this.connectionChannel.run();
            this.sendConnectAction();
        });
    }

    public stop(): void {
        this.rejectCallback?.();
    }

    private sendConnectAction() {
        const connectAction: IBestStrategyResolverClientConnectAction = {
            type: BestStrategyResolverClientActions.Connect,
            strategies: this.availableConnectionStrategies.map(strategy => strategy.type),
        };
        this.connectionChannel.sendAction(connectAction);
    }
}
