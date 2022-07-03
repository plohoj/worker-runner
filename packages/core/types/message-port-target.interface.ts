import { IMessageEventTarget } from './message-event-target.interface';

export interface IMessagePortTarget<Data = unknown> extends IMessageEventTarget<Data> {
    start(): void;
    close(): void;
}
