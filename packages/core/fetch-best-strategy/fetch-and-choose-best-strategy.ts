import { BaseConnectionChannel } from '../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../connection-strategies/base/base.connection-strategy-client';
import { BaseConnectionStrategyHost } from '../connection-strategies/base/base.connection-strategy-host';
import { ConnectionStrategyEnum } from '../connection-strategies/connection-strategy.enum';
import { WorkerRunnerCommonConnectionStrategyError } from '../errors/worker-runner-error';
import { IAction } from '../types/action';
import { IFetchBestStrategyConnectAction, IFetchBestStrategyConnectedAction, FetchBestStrategyActions, IFetchBestStrategyAction } from './fetch-best-strategy.actions';

function isAction<T extends IAction>(action: unknown): action is T | IAction {
    return !!(action as IAction | undefined)?.type;
}

interface IFetchAndChooseBestStrategyConfig<T extends BaseConnectionStrategyClient | BaseConnectionStrategyHost> {
    connectionChannel: BaseConnectionChannel;
    hasStrategyPriority: boolean;
    sendConnectAction: boolean;
    availableStrategies: T[];
}

/**
 * Exchange of available strategies and determination of the best strategy.
 * The exchange uses the principle of ping-pong
 * 
 * **WARNING**: To get the best result of receiving a message through the MessagePort,
 * running the ConnectionChannel will be called in this method
 */
export function fetchAndChooseBestStrategy<T extends BaseConnectionStrategyClient | BaseConnectionStrategyHost>(
    config: IFetchAndChooseBestStrategyConfig<T>,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const strategies: Array<ConnectionStrategyEnum | string>
            = config.availableStrategies.map(availableStrategy => availableStrategy.type);
        let wasReceivedConnectAction = false;
        const handler = (action: unknown) => {
            if (!isAction<IFetchBestStrategyAction>(action)) {
                return;
            }
            const isFetchBestStrategyAction
                = action.type === FetchBestStrategyActions.CONNECT
                || action.type === FetchBestStrategyActions.CONNECTED;
            if (!isFetchBestStrategyAction) {
                return;
            }
            config.connectionChannel.removeActionHandler(handler);

            const priorityStrategies: Array<ConnectionStrategyEnum | string> = config.hasStrategyPriority
                ? strategies
                : (action as IFetchBestStrategyAction).strategies;
            const nonPriorityStrategies: Array<ConnectionStrategyEnum | string> = config.hasStrategyPriority
                ? (action as IFetchBestStrategyAction).strategies
                : strategies;

            let bestStrategyEnum: ConnectionStrategyEnum | string | undefined;
            for (const priorityStrategy of priorityStrategies) {
                if (nonPriorityStrategies.includes(priorityStrategy)) {
                    bestStrategyEnum = priorityStrategy;
                    break;
                }
            }
            const bestStrategy: T | undefined = config.availableStrategies
                .find(availableStrategy => availableStrategy.type === bestStrategyEnum);

            if (action.type === FetchBestStrategyActions.CONNECT) {
                wasReceivedConnectAction = true;
                const connectedAction: IFetchBestStrategyConnectedAction = {
                    type: FetchBestStrategyActions.CONNECTED,
                    strategies,
                };
                config.connectionChannel.sendAction(connectedAction);
            }
            if (bestStrategy) {
                resolve(bestStrategy);
            } else {
                reject(new WorkerRunnerCommonConnectionStrategyError());
            }
        }
        config.connectionChannel.addActionHandler(handler);
        config.connectionChannel.run();
        if (!wasReceivedConnectAction && config.sendConnectAction) {
            const connectAction: IFetchBestStrategyConnectAction = {
                type: FetchBestStrategyActions.CONNECT,
                strategies,
            };
            config.connectionChannel.sendAction(connectAction);
        }
    });
}
