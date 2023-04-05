import { ProxyReceiveConnectionChannelInterceptor } from '../connection-channel-interceptor/proxy-receive.connection-channel-interceptor';
import { IAction } from '../types/action';
import { JsonLike } from '../types/json-like';
import { WorkerRunnerIdentifier } from '../utils/identifier-generator';
import { BaseConnectionChannel } from './base.connection-channel';

export type ConnectionChannelProxyData<
    FieldName extends string = string,
    Value extends JsonLike | WorkerRunnerIdentifier = JsonLike | WorkerRunnerIdentifier
> = [fieldName: FieldName, value: Value];

export class ProxyConnectionChannel extends BaseConnectionChannel {
    private proxyInterceptor: ProxyReceiveConnectionChannelInterceptor;

    constructor(
        private readonly originalChannel: BaseConnectionChannel,
        private readonly proxyData: ConnectionChannelProxyData,
    ) {
        super();
        this.proxyInterceptor = new ProxyReceiveConnectionChannelInterceptor({
            proxyConnectionChannel: this,
            proxyData: this.proxyData,
        });
    }

    public override run(): void {
        this.originalChannel.interceptorsComposer.addInterceptors(this.proxyInterceptor);
        super.run();
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

    // TODO Proxy connection will not be able to resend transferable data
    protected override nativeSendAction(action: IAction, transfer?: Transferable[]): void {
        this.originalChannel.sendAction({
            ...action,
            [this.proxyData[0]]: this.proxyData[1],
        }, transfer);
    }

    protected override afterDestroy(): void {
        this.originalChannel.interceptorsComposer.removeInterceptors(this.proxyInterceptor);
        super.afterDestroy();
    }
}
