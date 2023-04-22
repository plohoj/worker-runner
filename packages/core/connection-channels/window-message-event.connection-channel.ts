import { IAction } from '../types/action';
import { MessageEventHandler } from '../types/message-event-handler';
import { IMessageEventListenerTarget } from '../types/targets/message-event-listener-target';
import { IWindowMessageEventTarget } from '../types/targets/window-message-event-target';
import { BaseMessageEventListenerConnectionChannel, IBaseMessageEventListenerConnectionChannelConfig } from './base-message-event-listener.connection-channel';

export interface IMessageEventConnectionChannelConfig
    extends Omit<IBaseMessageEventListenerConnectionChannelConfig<IWindowMessageEventTarget>, 'target'>
{
    eventListenerTarget: IMessageEventListenerTarget;
    postMessageTarget: IWindowMessageEventTarget;
    targetOrigin: string;
}

export class WindowMessageEventConnectionChannel
    extends BaseMessageEventListenerConnectionChannel<IMessageEventListenerTarget>
{
    public readonly targetOrigin: string;
    public readonly postMessageTarget: IWindowMessageEventTarget;
    
    constructor(config: IMessageEventConnectionChannelConfig) {
        super({
            ...config,
            target: config.eventListenerTarget,
        });
        this.postMessageTarget = config.postMessageTarget;
        this.targetOrigin = config.targetOrigin;
    }

    protected override nativeSendAction(action: IAction, transfer?: Transferable[]): void {
        this.postMessageTarget.postMessage(action, this.targetOrigin, transfer);
    }

    protected override readonly messageHandler: MessageEventHandler<unknown> = event => {
        if (event.origin.search(this.targetOrigin) === 0) { // Domain name is the same from the first letter
            this.actionHandler(event.data as IAction)
        }
    };
}
