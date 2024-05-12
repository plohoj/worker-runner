import { ProxyReceiveConnectionChannelInterceptor } from '../connection-channel-interceptor/proxy-receive.connection-channel-interceptor';
import { DisconnectReason } from '../connections/base/disconnect-reason';
import { IAction } from '../types/action';
import { JsonLike } from '../types/json-like';
import { WorkerRunnerIdentifier } from '../utils/identifier-generator';
import { BaseConnectionChannel, IBaseConnectionChannel } from './base.connection-channel';

export type ConnectionChannelProxyData<
    FieldName extends string = string,
    Value extends JsonLike | WorkerRunnerIdentifier = JsonLike | WorkerRunnerIdentifier
> = [fieldName: FieldName, value: Value];

export class ProxyConnectionChannel extends BaseConnectionChannel {
    private proxyInterceptor: ProxyReceiveConnectionChannelInterceptor;

    constructor(
        private readonly originalChannel: IBaseConnectionChannel,
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
        this.originalChannel.destroyStartHandlerController.addHandler((disconnectReason => {
            // If the original connection was lost, the proxy connection must also be closed
            if (disconnectReason === DisconnectReason.ConnectionLost) {
                this.destroy({disconnectReason});
            }
        }));
    }

    public getRootOriginalChannel(): IBaseConnectionChannel {
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
