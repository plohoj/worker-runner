import { MessageEventConnectionChannel } from '../../connection-channels/message-event.connection-channel';
import { IBaseConnectionIdentificationChecker } from '../../connection-identification/checker/base.connection-identification-checker';
import { IMessageEventTarget } from '../../types/targets/message-event-target';
import { BaseMessageEventListenerConnectionHost, IBaseMessageEventListenerConnectionHostConfig } from '../base-message-event-listener/base-message-event-listener.connection-host';

export type IMessageEventConnectionHostConfig = IBaseMessageEventListenerConnectionHostConfig<IMessageEventTarget>;

export class MessageEventConnectionHost extends BaseMessageEventListenerConnectionHost<IMessageEventTarget> {

    constructor(config: IMessageEventConnectionHostConfig) {
        super(config);
    }

    protected override buildConnectionChannel(
        identificationChecker?: IBaseConnectionIdentificationChecker,
    ): MessageEventConnectionChannel {
        return new MessageEventConnectionChannel({
            target: this.target,
            identificationChecker,
        });
    }
}
