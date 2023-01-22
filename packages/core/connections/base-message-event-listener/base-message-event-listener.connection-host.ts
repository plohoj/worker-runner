import { BestStrategyResolverHost } from '../../best-strategy-resolver/host/best-strategy-resolver.host';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { IBaseConnectionIdentificationChecker } from '../../connection-identification/checker/base.connection-identification-checker';
import { IBaseConnectionIdentificationStrategyHost } from '../../connection-identification/strategy/base/base.connection-identification-strategy.host';
import { ConnectionIdentificationStrategyComposerHost } from '../../connection-identification/strategy/composer/connection-identification-strategy.composer.host';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { IMessageEventListenerTarget } from '../../types/targets/message-event-listener-target';
import { BaseConnectionHost, ConnectionHostHandler } from '../base/base.connection-host';

export interface IBaseMessageEventListenerConnectionHostConfig<T extends IMessageEventListenerTarget> {
    target: T;
    /**
     * One of the strategies will be used.
     * The choice will be among those strategies that match between the client and the host.
     * Preference is given to left to right
     */
    connectionStrategies: BaseConnectionStrategyHost[],
    /** All connection identification strategies will be used for the connection */
    identificationStrategies?: IBaseConnectionIdentificationStrategyHost[];
}

export abstract class BaseMessageEventListenerConnectionHost<T extends IMessageEventListenerTarget> extends BaseConnectionHost {
    public readonly target: T;
    private readonly connectionStrategies: BaseConnectionStrategyHost[];
    private readonly identificationStrategy?: IBaseConnectionIdentificationStrategyHost;
    private stopCallback?: () => void;

    constructor(config: IBaseMessageEventListenerConnectionHostConfig<T>) {
        super();
        this.target = config.target;
        this.connectionStrategies = config.connectionStrategies;
        const identificationStrategies = config.identificationStrategies || [];
        if (identificationStrategies.length > 0) {
            this.identificationStrategy = identificationStrategies.length === 1
                ? identificationStrategies[0]
                : new ConnectionIdentificationStrategyComposerHost({ identificationStrategies })
        }
    }

    public override startListen(handler: ConnectionHostHandler): void {
        const initialConnectionChannel = this.buildConnectionChannel();
        // The BaseConnectionChannel.run() will be called in the BestStrategyResolverHost.run() method
        const bestStrategyResolver = new BestStrategyResolverHost({
            connectionChannel: initialConnectionChannel,
            availableStrategies: this.connectionStrategies,
            sendPingAction: true,
            identificationStrategy: this.identificationStrategy,
        });
        bestStrategyResolver.run(
            resolvedConnection => handler({
                connectionChannel: this.buildConnectionChannel(resolvedConnection.identificationChecker),
                connectionStrategy: resolvedConnection.connectionStrategy,
            }),
            error => {
                throw error;
            },
        );
        this.stopCallback = () => {
            bestStrategyResolver.stop();
            initialConnectionChannel.destroy(true);
            this.stopCallback = undefined;
        }
    }

    public override stop(): void {
        this.stopCallback?.();
    }

    protected abstract buildConnectionChannel(
        identificationChecker?: IBaseConnectionIdentificationChecker
    ): BaseConnectionChannel;
}
