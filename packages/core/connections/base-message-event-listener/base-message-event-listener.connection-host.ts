import { BestStrategyResolverHost } from '../../best-strategy-resolver/host/best-strategy-resolver.host';
import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { IInterceptPlugin } from '../../plugins/intercept-plugin/intercept.plugin';
import { IMessageEventListenerTarget } from '../../types/targets/message-event-listener-target';
import { ConnectionHostHandler, IBaseConnectionHost } from '../base/base.connection-host';
import { DisconnectReason } from '../base/disconnect-reason';

export interface IBaseMessageEventListenerConnectionHostConfig<T extends IMessageEventListenerTarget> {
    target: T;
    /**
     * One of the strategies will be used.
     * The choice will be among those strategies that match between the client and the host.
     * Preference is given to left to right
     */
    connectionStrategies: BaseConnectionStrategyHost[],
    /** All intercept plugins will be used for the connection */
    plugins?: IInterceptPlugin[];
}

export abstract class BaseMessageEventListenerConnectionHost<T extends IMessageEventListenerTarget>
    implements IBaseConnectionHost
{
    public readonly target: T;
    private readonly connectionStrategies: BaseConnectionStrategyHost[];
    private readonly interceptPlugins: IInterceptPlugin[];
    private stopCallback?: () => void;

    constructor(config: IBaseMessageEventListenerConnectionHostConfig<T>) {
        this.target = config.target;
        this.connectionStrategies = config.connectionStrategies;
        this.interceptPlugins = config.plugins || [];
    }

    public registerPlugins(interceptPlugins: IInterceptPlugin[]): void {
        this.interceptPlugins.unshift(...interceptPlugins);
    }

    public startListen(handler: ConnectionHostHandler): void {
        const initialConnectionChannel = this.buildConnectionChannel();
        // The BaseConnectionChannel.run() will be called in the BestStrategyResolverHost.run() method
        const bestStrategyResolver = new BestStrategyResolverHost({
            connectionChannel: initialConnectionChannel,
            availableStrategies: this.connectionStrategies,
            sendPingAction: true,
            interceptPlugins: this.interceptPlugins,
        });
        bestStrategyResolver.run(
            resolvedConnection => {
                const resolvedConnectionChannel = this.buildConnectionChannel();
                resolvedConnectionChannel.interceptorsComposer.addInterceptors(
                    ...resolvedConnection.connectionChannelInterceptors
                );
                handler({
                    connectionChannel: resolvedConnectionChannel,
                    connectionStrategy: resolvedConnection.connectionStrategy,
                })
            },
            error => {
                throw error;
            },
        );
        this.stopCallback = () => {
            bestStrategyResolver.stop();
            initialConnectionChannel.destroy({
                saveConnectionOpened: true,
                disconnectReason: DisconnectReason.ResolverDestroyed,
            });
            this.stopCallback = undefined;
        }
    }

    public stop(): void {
        this.stopCallback?.();
    }

    protected abstract buildConnectionChannel(): IBaseConnectionChannel;
}
