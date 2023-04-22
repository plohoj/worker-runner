import { BestStrategyResolverHostActions } from '../../best-strategy-resolver/host/best-strategy-resolver.host.actions';
import { IConnectionChannelInterceptor } from '../../connection-channel-interceptor/connection-channel-interceptor';
import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { IInterceptPlugin } from '../../plugins/intercept-plugin/intercept.plugin';
import { IBaseConnectionClient, IEstablishedConnectionClientData } from '../base/base.connection-client';

export interface PortalConnectionClientConfig {
    connectionChannel: IBaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyClient;
}

export class PortalConnectionClient implements IBaseConnectionClient {

    private readonly connectionChannel: IBaseConnectionChannel;
    private readonly connectionStrategy: BaseConnectionStrategyClient;

    constructor(config: PortalConnectionClientConfig) {
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

    public connect(): IEstablishedConnectionClientData {
        return {
            connectionChannel: this.connectionChannel,
            connectionStrategy: this.connectionStrategy,
        }
    }
}
