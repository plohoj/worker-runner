import { IConnectionChannelInterceptor } from '../../connection-channel-interceptor/connection-channel-interceptor';
import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { ConnectionStrategyEnum } from '../../connection-strategies/connection-strategy.enum';
import { WorkerRunnerCommonConnectionStrategyError } from '../../errors/worker-runner-error';
import { IInterceptPlugin } from '../../plugins/intercept-plugin/intercept.plugin';
import { isAction } from '../../utils/is-action';
import { BestStrategyResolverClientActions, IBestStrategyResolverClientConnectAction } from '../client/best-strategy-resolver.client.actions';
import { BestStrategyResolverHostActions, IBestStrategyResolverHostConnectedAction, IBestStrategyResolverHostPingAction } from "./best-strategy-resolver.host.actions";

export interface IBestStrategyResolverHostConfig {
    connectionChannel: IBaseConnectionChannel;
    sendPingAction: boolean;
    availableStrategies: BaseConnectionStrategyHost[];
    interceptPlugins: IInterceptPlugin[];
}

export interface IBestStrategyResolverHostResolvedConnection {
    connectionStrategy: BaseConnectionStrategyHost;
    connectionChannelInterceptors: IConnectionChannelInterceptor[];
}

/**
 * Exchange of available strategies and determination of the best strategy.
 * The exchange uses the principle of ping-pong
 * 
 * **WARNING**: To get the best result of receiving a message through the {@link MessagePort},
 * running the {@link IBaseConnectionChannel} will be called in {@link run} method
 */
export class BestStrategyResolverHost {
    private readonly connectionChannel: IBaseConnectionChannel;
    private readonly sendPingAction: boolean;
    private readonly availableStrategies: BaseConnectionStrategyHost[];
    private readonly availableStrategiesTypes: Array<ConnectionStrategyEnum | string>;
    private readonly interceptPlugins: IInterceptPlugin[];
    private stopCallback?: () => void;

    constructor(config: IBestStrategyResolverHostConfig) {
        this.connectionChannel = config.connectionChannel;
        this.sendPingAction = config.sendPingAction;
        this.availableStrategies = config.availableStrategies;
        this.interceptPlugins = config.interceptPlugins;
        this.availableStrategiesTypes
            = this.availableStrategies.map(availableStrategy => availableStrategy.type)
    }

    public run(
        next: (resolvedConnection: IBestStrategyResolverHostResolvedConnection) => void,
        error: (error: WorkerRunnerCommonConnectionStrategyError) => void
    ): void {
        let wasReceivedConnectAction = false;
        const handler = (action: unknown) => {
            if (!isAction<IBestStrategyResolverClientConnectAction>(action)) {
                return;
            }
            if (action.type !== BestStrategyResolverClientActions.Connect) {
                return;
            }

            const connectedAction: IBestStrategyResolverHostConnectedAction = {
                type: BestStrategyResolverHostActions.Connected,
                strategies: this.availableStrategiesTypes,
            };

            wasReceivedConnectAction = true;

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

            this.connectionChannel.sendAction(connectedAction);
            if (bestStrategy) {
                next({
                    connectionStrategy: bestStrategy,
                    connectionChannelInterceptors: this.interceptPlugins
                        .map(plugin => plugin.getInterceptorAfterConnect?.({type: BestStrategyResolverHostActions.Connected}))
                        // eslint-disable-next-line unicorn/no-array-callback-reference
                        .filter(Boolean as unknown as (interceptor: IConnectionChannelInterceptor | undefined) =>
                            interceptor is IConnectionChannelInterceptor
                        ),
                });
            } else {
                error(new WorkerRunnerCommonConnectionStrategyError());
            }
        }
        this.stopCallback = () => {
            this.connectionChannel.actionHandlerController.removeHandler(handler);
            this.stopCallback = undefined
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
        // TODO setTimeout - Crutch for synchronous calls. Because on the client side what happens is:
        // 1) Sent a Connect action;
        // 2) Got the Ping action;
        // 3) Sent a duplicate Connect action;
        // TODO The problem of duplicate connections is not completely solved
        // It is preferable to use the algorithm to check the heartbeat
        // TODO Need add PONG action? 
        setTimeout(() => {
            if (!wasReceivedConnectAction && this.sendPingAction) {
                const pingAction: IBestStrategyResolverHostPingAction = {
                    type: BestStrategyResolverHostActions.Ping,
                };
                this.connectionChannel.sendAction(pingAction);
            }
        }, 100);
    }

    public stop(): void {
        this.stopCallback?.();
    }
}
