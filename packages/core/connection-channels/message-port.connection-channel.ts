import { IMessagePortTarget } from '../types/targets/message-port-target';
import { IBaseMessageEventListenerConnectionChannelConfig } from './base-message-event-listener.connection-channel';
import { MessageEventConnectionChannel } from './message-event.connection-channel';

export type IMessagePortConnectionChannelConfig = IBaseMessageEventListenerConnectionChannelConfig<IMessagePortTarget>;

export class MessagePortConnectionChannel extends MessageEventConnectionChannel {

    public override readonly target!: IMessagePortTarget;
    
    constructor(config: IMessagePortConnectionChannelConfig) {
        super(config);
    }

    public override run(): void {
        super.run();
        this.target.start();
    }

    protected override afterDestroy(): void {
        super.afterDestroy();
        if (!this.saveConnectionOpened) {
            this.target.close();
        }
    }
}
