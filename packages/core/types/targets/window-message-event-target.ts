import { IMessageEventListenerTarget } from './message-event-listener-target';

export interface IWindowMessageEventTarget<Data = unknown> extends IMessageEventListenerTarget<Data> {
    postMessage(message: unknown, targetOrigin?: string, transfer?: Transferable[]): void;
}
