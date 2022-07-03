import { IMessageEventTarget } from '../types/message-event-target.interface';
import { BaseConnectionChannel, ConnectionChannelProxyData } from './base.connection-channel';

export interface IMessageEventConnectionChannelConfig<AttachableData extends Record<string, unknown>> {
    target: IMessageEventTarget;
    proxyData?: AttachableData;
}

export class MessageEventConnectionChannel<
    AttachableData extends ConnectionChannelProxyData = ConnectionChannelProxyData
> extends BaseConnectionChannel<AttachableData> {

    public readonly target: IMessageEventTarget;
    
    public proxyData: AttachableData;
    public isConnected = false;

    private readonly handlers = new Set<(data: unknown) => void>();
    
    constructor(config: IMessageEventConnectionChannelConfig<AttachableData>) {
        super();
        this.target = config.target;
        this.proxyData = config.proxyData || {} as AttachableData;
    }

    public sendAction<T>(data: T, transfer?: Transferable[]): void {
        const proxiedData: T & AttachableData = {
            ...data,
            ...this.proxyData,
        };
        this.target.postMessage(proxiedData, transfer)
    }

    public addActionHandler<T>(handler: (data: T) => void): void {
        const wasEmpty = this.handlers.size === 0;
        this.handlers.add(handler as (data: unknown) => void);
        if (wasEmpty) {
            this.target.addEventListener('message', this.messageHandler);
        }
    }

    public removeActionHandler<T>(handler: (data: T) => void): void {
        this.handlers.delete(handler as (data: unknown) => void);
        if (this.handlers.size === 0) {
            this.target.removeEventListener('message', this.messageHandler);
        }
    }

    public run(): void {
        this.isConnected = true;
    }

    public destroy(): void {
        this.isConnected = false;
        this.handlers.clear();
        this.target.removeEventListener('message', this.messageHandler);
    }

    public clone<U extends AttachableData = AttachableData>(attachableData?: U): BaseConnectionChannel<U> {
        throw new Error('Method not implemented.');
    }

    private readonly messageHandler = <T>(event: MessageEvent<T>) => {
        for (const handler of this.handlers) {
            handler(event.data);
            // TODO Need filter by proxy data? Need eject proxy data?
        }
    };
}
