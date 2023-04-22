import { BestStrategyResolverHostActions } from '../../best-strategy-resolver/host/best-strategy-resolver.host.actions';
import { IConnectionChannelInterceptor } from '../../connection-channel-interceptor/connection-channel-interceptor';
import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { IInterceptPlugin } from '../../plugins/intercept-plugin/intercept.plugin';
import { IBaseConnectionHost, ConnectionHostHandler } from '../base/base.connection-host';

export interface PortalConnectionHostConfig {
    connectionChannel: IBaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyHost;
}

export class PortalConnectionHost implements IBaseConnectionHost {

    private readonly connectionChannel: IBaseConnectionChannel;
    private readonly connectionStrategy: BaseConnectionStrategyHost;

    constructor(config: PortalConnectionHostConfig) {
        this.connectionChannel = config.connectionChannel;
        this.connectionStrategy = config.connectionStrategy;
    }

    public registerPlugins(interceptPlugins: IInterceptPlugin[]): void {
        this.connectionChannel.interceptorsComposer.addInterceptors(
            ...interceptPlugins
                .map(plugin => plugin.getInterceptorAfterConnect?.({type: BestStrategyResolverHostActions.Connected}))
                // eslint-disable-next-line unicorn/no-array-callback-reference
                .filter(Boolean as unknown as (interceptor: IConnectionChannelInterceptor | undefined) =>
                    interceptor is IConnectionChannelInterceptor
                )
        );
    }

    public startListen(handler: ConnectionHostHandler): void {
        handler({
            connectionChannel: this.connectionChannel,
            connectionStrategy: this.connectionStrategy,
        });
    }
}
