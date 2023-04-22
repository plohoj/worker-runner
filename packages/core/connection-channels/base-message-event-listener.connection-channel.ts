import { IAction } from '../types/action';
import { MessageEventHandler } from '../types/message-event-handler';
import { IMessageEventListenerTarget } from '../types/targets/message-event-listener-target';
import { BaseConnectionChannel } from './base.connection-channel';

export interface IBaseMessageEventListenerConnectionChannelConfig<T extends IMessageEventListenerTarget> {
    target: T;
}

export abstract class BaseMessageEventListenerConnectionChannel<
    T extends IMessageEventListenerTarget
> extends BaseConnectionChannel {

    public readonly target: T;

    constructor(config: IBaseMessageEventListenerConnectionChannelConfig<T>) {
        super();
        this.target = config.target;
    }

    public override run(): void {
        super.run();
        this.target.addEventListener('message', this.messageHandler);
    }

    protected override afterDestroy(): void {
        this.target.removeEventListener('message', this.messageHandler);
        super.afterDestroy();
    }

    protected readonly messageHandler: MessageEventHandler<unknown> = event => this.actionHandler(event.data as IAction);
}
