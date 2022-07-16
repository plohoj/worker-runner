import { IAction } from '../types/action';
import { IMessageEventTarget } from '../types/message-event-target.interface';
import { BaseConnectionChannel } from './base.connection-channel';

export interface IMessageEventConnectionChannelConfig {
    target: IMessageEventTarget;
}

export class MessageEventConnectionChannel extends BaseConnectionChannel {

    public readonly target: IMessageEventTarget;
    
    constructor(config: IMessageEventConnectionChannelConfig) {
        super();
        this.target = config.target;
    }

    public override sendAction(action: IAction, transfer?: Transferable[]): void {
        this.target.postMessage(action, transfer)
    }

    public override run(): void {
        super.run();
        this.target.addEventListener('message', this.messageHandler);
    }

    protected override afterDestroy(): void {
        this.target.removeEventListener('message', this.messageHandler);
    }

    private readonly messageHandler = (event: MessageEvent<unknown>) => {
        this.actionHandler(event.data as IAction);
    };
}
