import { IAction } from '../types/action';
import { IMessageEventTarget } from '../types/targets/message-event-target';
import { BaseMessageEventListenerConnectionChannel, IBaseMessageEventListenerConnectionChannelConfig } from './base-message-event-listener.connection-channel';

export type IMessageEventConnectionChannel = IBaseMessageEventListenerConnectionChannelConfig<IMessageEventTarget>;

export class MessageEventConnectionChannel extends BaseMessageEventListenerConnectionChannel<IMessageEventTarget> {
    
    constructor(config: IMessageEventConnectionChannel) {
        super(config);
    }

    protected override nativeSendAction(action: IAction, transfer?: Transferable[]): void {
        this.identificationChecker?.attachIdentifier(action);
        this.target.postMessage(action, transfer)
    }
}
