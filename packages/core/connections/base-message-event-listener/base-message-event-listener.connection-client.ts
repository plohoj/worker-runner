import { BestStrategyResolverClient, IBestStrategyResolverClientResolvedConnection } from '../../best-strategy-resolver/client/best-strategy-resolver.client';
import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { IInterceptPlugin } from '../../plugins/intercept-plugin/intercept.plugin';
import { IMessageEventListenerTarget } from '../../types/targets/message-event-listener-target';
import { IBaseConnectionClient, IEstablishedConnectionClientData } from '../base/base.connection-client';

export interface IBaseMessageEventListenerConnectionClientConfig<T extends IMessageEventListenerTarget> {
    target: T;
    /**
     * One of the strategies will be used for connection.
     * The choice will be among those strategies that match between the client and the host.
     * Preference is given to left to right
     */
    connectionStrategies: BaseConnectionStrategyClient[],
    /** All intercept plugins will be used for the connection */
    plugins?: IInterceptPlugin[];
}

export abstract class BaseMessageEventListenerConnectionClient<
    T extends IMessageEventListenerTarget
> implements IBaseConnectionClient {
    protected readonly target: T;
    private readonly connectionStrategies: BaseConnectionStrategyClient[];
    private interceptPlugins: IInterceptPlugin[];
    private stopCallback?: () => void;

    constructor(config: IBaseMessageEventListenerConnectionClientConfig<T>) {
        this.target = config.target;
        this.interceptPlugins = config.plugins || []
        this.connectionStrategies = config.connectionStrategies;
    }

    public registerPlugins(interceptPlugins: IInterceptPlugin[]): void {
        this.interceptPlugins.unshift(...interceptPlugins);
    }

    public async connect(): Promise<IEstablishedConnectionClientData> {
        const initialConnectionChannel = this.buildConnectionChannel();
        // The ConnectionChannel.run() will be called in the BestStrategyResolverClient.resolve() method
        const bestStrategyResolver = new BestStrategyResolverClient({
            connectionChannel: initialConnectionChannel,
            availableConnectionStrategies: this.connectionStrategies,
            interceptPlugins: this.interceptPlugins,
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
        const resolvedConnectionChannel = this.buildConnectionChannel();
        resolvedConnectionChannel.interceptorsComposer.addInterceptors(
            ...resolvedConnection.connectionChannelInterceptors
        );
        return {
            connectionChannel: resolvedConnectionChannel,
            connectionStrategy: resolvedConnection.connectionStrategy,
        };
    }

    public stop(): void {
        this.stopCallback?.();
        this.stopCallback = undefined;
    }

    protected abstract buildConnectionChannel(): IBaseConnectionChannel;
}
