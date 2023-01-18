import { IMessageEventListenerTarget } from './message-event-listener-target';

export interface IMessageEventTarget<Data = unknown> extends IMessageEventListenerTarget<Data> {
    postMessage(message: unknown, transfer?: Transferable[]): void;
}
