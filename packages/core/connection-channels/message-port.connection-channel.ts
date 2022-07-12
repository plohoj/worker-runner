import { IMessagePortTarget } from '../types/message-port-target.interface';
import { MessageEventConnectionChannel } from './message-event.connection-channel';

export interface IMessagePortConnectionChannelConfig {
    target: IMessagePortTarget;
}

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
