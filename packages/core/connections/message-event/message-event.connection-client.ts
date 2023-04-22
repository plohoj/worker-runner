import { MessageEventConnectionChannel } from '../../connection-channels/message-event.connection-channel';
import { IMessageEventTarget } from '../../types/targets/message-event-target';
import { BaseMessageEventListenerConnectionClient, IBaseMessageEventListenerConnectionClientConfig } from '../base-message-event-listener/base-message-event-listener.connection-client';

export type IMessageEventConnectionClientConfig = IBaseMessageEventListenerConnectionClientConfig<IMessageEventTarget>

export class MessageEventConnectionClient extends BaseMessageEventListenerConnectionClient<IMessageEventTarget> {

    constructor(config: IMessageEventConnectionClientConfig) {
        super(config);
    }

    protected override buildConnectionChannel(): MessageEventConnectionChannel {
        return new MessageEventConnectionChannel({ target: this.target });
    }
}
