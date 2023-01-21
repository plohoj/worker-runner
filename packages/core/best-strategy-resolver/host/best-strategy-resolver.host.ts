import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { IBaseConnectionIdentificationChecker } from '../../connection-identification/checker/base.connection-identification-checker';
import { IBaseConnectionIdentificationStrategyHost } from '../../connection-identification/strategy/base/base.connection-identification-strategy.host';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { ConnectionStrategyEnum } from '../../connection-strategies/connection-strategy.enum';
import { WorkerRunnerCommonConnectionStrategyError } from '../../errors/worker-runner-error';
import { isAction } from '../../utils/is-action';
import { IBestStrategyResolverClientConnectAction, BestStrategyResolverClientActions } from '../client/best-strategy-resolver.client.actions';
import { BestStrategyResolverHostActions, IBestStrategyResolverHostConnectedAction, IBestStrategyResolverHostPingAction } from "./best-strategy-resolver.host.actions";

export interface IBestStrategyResolverHostConfig {
    connectionChannel: BaseConnectionChannel;
    sendPingAction: boolean;
    availableStrategies: BaseConnectionStrategyHost[];
    identificationStrategy?: IBaseConnectionIdentificationStrategyHost;
}

export interface IBestStrategyResolverHostResolvedConnection {
    connectionStrategy: BaseConnectionStrategyHost;
    identificationChecker?: IBaseConnectionIdentificationChecker;
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
    private readonly identificationStrategy?: IBaseConnectionIdentificationStrategyHost;
    private stopCallback?: () => void;

    constructor(config: IBestStrategyResolverHostConfig) {
        this.connectionChannel = config.connectionChannel;
        this.sendPingAction = config.sendPingAction;
        this.availableStrategies = config.availableStrategies;
        this.identificationStrategy = config.identificationStrategy;
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
            if (action.type !== BestStrategyResolverClientActions.CONNECT) {
                return;
            }
            // TODO There may be a situation when the client:
            // 1) Sent a Connect action;
            // 2) Got the Ping action;
            // 3) Sent a duplicate Connect action;

            const connectedAction: IBestStrategyResolverHostConnectedAction = {
                type: BestStrategyResolverHostActions.CONNECTED,
                strategies: this.availableStrategiesTypes,
            };
            const identificationChecker = this.identificationStrategy?.checkIdentifier(action, connectedAction);
            if (identificationChecker === false) {
                return;
            }

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
                    identificationChecker,
                });
            } else {
                error(new WorkerRunnerCommonConnectionStrategyError());
            }
        }
        this.stopCallback = () => {
            this.connectionChannel.actionHandlerController.removeHandler(handler);
            this.stopCallback = undefined
        };
        this.connectionChannel.actionHandlerController.addHandler(handler);
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
