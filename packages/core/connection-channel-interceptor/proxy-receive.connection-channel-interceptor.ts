import { IBaseConnectionChannel } from '../connection-channels/base.connection-channel';
import { ConnectionChannelProxyData } from '../connection-channels/proxy.connection-channel';
import { IAction } from '../types/action';
import { ConnectionChannelInterceptorRejectEnum, IConnectionChannelInterceptor, IConnectionChannelInterceptResult, IConnectionChannelInterceptResultOptions } from './connection-channel-interceptor';

export interface IProxyReceiveConnectionChannelInterceptor {
    proxyConnectionChannel: IBaseConnectionChannel;
    proxyData: ConnectionChannelProxyData,
}

export class ProxyReceiveConnectionChannelInterceptor implements IConnectionChannelInterceptor {
    private readonly proxyConnectionChannel: IBaseConnectionChannel;
    private readonly proxyData: ConnectionChannelProxyData;

    constructor(config: IProxyReceiveConnectionChannelInterceptor) {
        this.proxyConnectionChannel = config.proxyConnectionChannel;
        this.proxyData = config.proxyData;
    }

    public interceptReceive(action: IAction): IConnectionChannelInterceptResult {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        if ((action as any)[this.proxyData[0]] === this.proxyData[1]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
            const {[this.proxyData[0]]: _, ...originalAction} = action as Record<any, any>;
            return {
                rejected: ConnectionChannelInterceptorRejectEnum.Soft,
                action: originalAction as IAction,
            }
        }
        return {};
    }

    public interceptReceiveResult(options: IConnectionChannelInterceptResultOptions): void {
        const isRejectedOnlyOwnSelf
            = options.rejected === ConnectionChannelInterceptorRejectEnum.Soft
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            && options.rejectedBy!.length === 1
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            && options.rejectedBy!.includes(this);
        if (isRejectedOnlyOwnSelf) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.proxyConnectionChannel.actionHandler(options.action!)
        }
    }

    public canBeDestroyed(): true | Promise<true> {
        if (this.proxyConnectionChannel.disconnectReason) {
            return true;
        }
        return new Promise(resolve => {
            this.proxyConnectionChannel.destroyFinishHandlerController.addHandler(() => resolve(true));
        })
    }
}
