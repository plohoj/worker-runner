import { IMessagePortTarget } from '../types/message-port-target.interface';
import { ConnectionChannelProxyData } from './base.connection-channel';
import { MessageEventConnectionChannel } from './message-event.connection-channel';

export interface IMessagePortConnectionChannelConfig<AttachableData extends Record<string, unknown>> {
    target: IMessagePortTarget;
    proxyData?: AttachableData;
}

export class MessagePortConnectionChannel<
    AttachableData extends ConnectionChannelProxyData = ConnectionChannelProxyData
> extends MessageEventConnectionChannel<AttachableData> {

    public override readonly target!: IMessagePortTarget;
    
    constructor(config: IMessagePortConnectionChannelConfig<AttachableData>) {
        super(config);
    }

    public override run(): void {
        super.run();
        this.target.start();
    }

    public override destroy(saveConnectionOpened = false): void {
        super.destroy();
        if (!saveConnectionOpened) {
            this.target.close();
        }
    }
}
