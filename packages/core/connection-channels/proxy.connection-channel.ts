import { JsonLike } from '..';
import { IAction } from '../types/action';
import { BaseConnectionChannel } from './base.connection-channel';

export type ConnectionChannelProxyData<FieldName extends string = string, Value extends JsonLike = JsonLike>
    = [fieldName: FieldName, value: Value];

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

    public sendAction(action: IAction, transfer?: Transferable[]): void {
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
        super.afterDestroy();
        this.onProxyDestroyed();
    }
}
