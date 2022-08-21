import { IAction } from '../types/action';
import { JsonLike } from '../types/json-like';
import { WorkerRunnerIdentifier } from '../utils/identifier-generator';
import { BaseConnectionChannel } from './base.connection-channel';

export type ConnectionChannelProxyData<
    FieldName extends string = string,
    Value extends JsonLike | WorkerRunnerIdentifier = JsonLike | WorkerRunnerIdentifier
> = [fieldName: FieldName, value: Value];

export class ProxyConnectionChannel<
    ProxyData extends ConnectionChannelProxyData = ConnectionChannelProxyData
> extends BaseConnectionChannel {
    private readonly onProxyDestroyed: () => void;

    constructor(
        private readonly originalChannel: BaseConnectionChannel,
        private readonly proxyData: ProxyData,
    ) {
        super();
        this.onProxyDestroyed = BaseConnectionChannel.attachProxy(originalChannel, proxyData, this);
    }

    public override sendAction(action: IAction, transfer?: Transferable[]): void {
        const proxyAction = {...action};
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        (proxyAction as any)[this.proxyData[0]] = this.proxyData[1];
        this.originalChannel.sendAction(proxyAction, transfer);
    }

    public getRootOriginalChannel(): BaseConnectionChannel {
        let parent = this.originalChannel;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (parent instanceof ProxyConnectionChannel) {
                parent = parent.originalChannel;
            } else {
                return parent;
            }
        }
    }

    protected override afterDestroy(): void {
        // The proxy connection was destroyed, but it was flagged that the connection should be kept alive.
        // This means that this proxy will still be used to create a proxy on top of this proxy.
        // * This proxy cannot be removed from the proxy list in the original connection.
        //   Otherwise, the original connection will stop forwarding proxied messages to this proxy connection.
        // * It is necessary to cancel the flag about the need to save the connection.
        //   so that the next time it is destroyed or when all child proxies are destroyed,
        //   it will cause the removal of this proxy from the proxy list of the original connection
        if (!this.saveConnectionOpened) {
            this.onProxyDestroyed();
        }
        this.saveConnectionOpened = false;
    }
}
