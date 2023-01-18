import { IAction } from '../types/action';
import { IWindowMessageEventTarget } from '../types/targets/window-message-event-target';
import { BaseMessageEventListenerConnectionChannel, IBaseMessageEventListenerConnectionChannelConfig } from './base-message-event-listener.connection-channel';

export interface IMessageEventConnectionChannelConfig
    extends IBaseMessageEventListenerConnectionChannelConfig<IWindowMessageEventTarget>
{
    targetOrigin: string;
}

// TODO Add domain validation to incoming messages (event.origin)
export class WindowMessageEventConnectionChannel
    extends BaseMessageEventListenerConnectionChannel<IWindowMessageEventTarget>
{
    public readonly targetOrigin: string;
    
    constructor(config: IMessageEventConnectionChannelConfig) {
        super(config);
        this.targetOrigin = config.targetOrigin;
    }

    public override sendAction(action: IAction, transfer?: Transferable[]): void {
        this.identificationChecker?.attachIdentifier(action);
        this.target.postMessage(action, this.targetOrigin, transfer);
    }
}
