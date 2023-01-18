import { MessageEventHandler } from '../message-event-handler';

export interface IMessageEventListenerTarget<Data = unknown> {
    addEventListener(type: 'message', handler: MessageEventHandler<Data>): void;
    removeEventListener(type: 'message', handler: MessageEventHandler<Data>): void;
}
