import { BestStrategyResolverClient, IBestStrategyResolverClientResolvedConnection } from '../../best-strategy-resolver/client/best-strategy-resolver.client';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { IBaseConnectionIdentificationChecker } from '../../connection-identification/checker/base.connection-identification-checker';
import { IBaseConnectionIdentificationStrategyClient } from '../../connection-identification/strategy/base/base.connection-identification-strategy.client';
import { ConnectionIdentificationStrategyComposerClient } from '../../connection-identification/strategy/composer/connection-identification-strategy.composer.client';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { IMessageEventListenerTarget } from '../../types/targets/message-event-listener-target';
import { BaseConnectionClient, IEstablishedConnectionClientData } from '../base/base.connection-client';

export interface IBaseMessageEventListenerConnectionClientConfig<T extends IMessageEventListenerTarget> {
    target: T;
    /**
     * One of the strategies will be used for connection.
     * The choice will be among those strategies that match between the client and the host.
     * Preference is given to left to right
     */
    connectionStrategies: BaseConnectionStrategyClient[],
    /** All connection identification strategies will be used for the connection */
    identificationStrategies?: IBaseConnectionIdentificationStrategyClient[];
}

export abstract class BaseMessageEventListenerConnectionClient<
    T extends IMessageEventListenerTarget
> extends BaseConnectionClient {
    protected readonly target: T;
    private readonly connectionStrategies: BaseConnectionStrategyClient[];
    private readonly identificationStrategy?: IBaseConnectionIdentificationStrategyClient;
    private stopCallback?: () => void;

    constructor(config: IBaseMessageEventListenerConnectionClientConfig<T>) {
        super();
        this.target = config.target;
        this.connectionStrategies = config.connectionStrategies;
        const identificationStrategies = config.identificationStrategies || [];
        if (identificationStrategies.length > 0) {
            this.identificationStrategy = identificationStrategies.length === 1
                ? identificationStrategies[0]
                : new ConnectionIdentificationStrategyComposerClient({ identificationStrategies })
        }
    }

    public override async connect(): Promise<IEstablishedConnectionClientData> {
        const initialConnectionChannel = this.buildConnectionChannel(this.target);
        // The ConnectionChannel.run() will be called in the BestStrategyResolverClient.resolve() method
        const bestStrategyResolver = new BestStrategyResolverClient({
            connectionChannel: initialConnectionChannel,
            availableConnectionStrategies: this.connectionStrategies,
            identificationStrategy: this.identificationStrategy
        });
        this.stopCallback = () => {
            bestStrategyResolver.stop();
            this.stopCallback = undefined;
        }
        let resolvedConnection: IBestStrategyResolverClientResolvedConnection;
        try {
            resolvedConnection = await bestStrategyResolver.resolve();
        } finally {
            this.stopCallback = undefined;
        }
        initialConnectionChannel.destroy(true);
        const resolvedConnectionChannel = this.buildConnectionChannel(this.target, resolvedConnection.identificationChecker);
        return {
            connectionChannel: resolvedConnectionChannel,
            connectionStrategy: resolvedConnection.connectionStrategy,
        };
    }

    public override stop(): void {
        this.stopCallback?.();
        this.stopCallback = undefined;
    }

    public abstract buildConnectionChannel(
        target: T,
        identificationChecker?: IBaseConnectionIdentificationChecker,
    ): BaseConnectionChannel;
}
