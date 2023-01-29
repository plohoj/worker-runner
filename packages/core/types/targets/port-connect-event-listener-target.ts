import { MessageEventHandler } from '../message-event-handler';

export interface IPortConnectEventListenerTarget<Data = unknown> {
    addEventListener(type: 'connect', handler: MessageEventHandler<Data>): void;
    removeEventListener(type: 'connect', handler: MessageEventHandler<Data>): void;
}
