import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { IBaseConnectionIdentificationChecker } from '../../connection-identification/checker/base.connection-identification-checker';
import { IBaseConnectionIdentificationStrategyClient } from '../../connection-identification/strategy/base/base.connection-identification-strategy.client';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { ConnectionClosedError } from '../../errors/runner-errors';
import { WorkerRunnerCommonConnectionStrategyError } from '../../errors/worker-runner-error';
import { isAction } from '../../utils/is-action';
import { BestStrategyResolverHostActions, IBestStrategyResolverHostAction } from '../host/best-strategy-resolver.host.actions';
import { BestStrategyResolverClientActions, IBestStrategyResolverClientConnectAction } from './best-strategy-resolver.client.actions';

export interface IBestStrategyResolverClientConfig {
    connectionChannel: BaseConnectionChannel;
    availableConnectionStrategies: BaseConnectionStrategyClient[];
    identificationStrategy?: IBaseConnectionIdentificationStrategyClient;
}

export interface IBestStrategyResolverClientResolvedConnection {
    connectionStrategy: BaseConnectionStrategyClient;
    identificationChecker?: IBaseConnectionIdentificationChecker;
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
    private readonly availableConnectionStrategies: BaseConnectionStrategyClient[];
    private readonly identificationStrategy?: IBaseConnectionIdentificationStrategyClient;
    private rejectCallback?: () => void;

    constructor(config: IBestStrategyResolverClientConfig) {
        this.connectionChannel = config.connectionChannel;
        this.availableConnectionStrategies = config.availableConnectionStrategies;
        this.identificationStrategy = config.identificationStrategy;
    }

    /**
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
                if (action.type === BestStrategyResolverHostActions.PING) {
                    this.sendConnectAction();
                    return;
                }
                if (action.type !== BestStrategyResolverHostActions.CONNECTED) {
                    return;
                }
    
                const identificationChecker = this.identificationStrategy?.checkIdentifier(action);
                if (identificationChecker === false) {
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
                        identificationChecker,
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
            type: BestStrategyResolverClientActions.CONNECT,
            strategies: this.availableConnectionStrategies.map(strategy => strategy.type),
        };
        this.identificationStrategy?.attachFirstIdentifier(connectAction);
        this.connectionChannel.sendAction(connectAction);
    }
}
