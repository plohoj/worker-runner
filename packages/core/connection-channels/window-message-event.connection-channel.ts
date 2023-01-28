import { IBaseConnectionIdentificationChecker } from '../connection-identification/checker/base.connection-identification-checker';
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

    public override sendAction(action: IAction, transfer?: Transferable[]): void {
        this.identificationChecker?.attachIdentifier(action);
        this.postMessageTarget.postMessage(action, this.targetOrigin, transfer);
    }

    protected override buildMessageHandler(
        identificationChecker?: IBaseConnectionIdentificationChecker | undefined
    ): MessageEventHandler<unknown> {
        const originalMessageHandler = super.buildMessageHandler(identificationChecker);
        return (event: MessageEvent<unknown>) => {
            if (event.origin.search(this.targetOrigin) === 0) {
                originalMessageHandler(event);
            }
        }
    }

}
