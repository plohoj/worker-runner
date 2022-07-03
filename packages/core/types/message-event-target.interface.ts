export type MessageEventHandler<Data> = (event: MessageEvent<Data>) => void;

export interface IMessageEventTarget<Data = unknown> {
    postMessage(message: unknown, transfer?: Transferable[]): void;
    addEventListener(type: 'message', handler: MessageEventHandler<Data>): void;
    removeEventListener(type: 'message', handler: MessageEventHandler<Data>): void;
}
