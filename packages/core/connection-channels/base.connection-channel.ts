import { ActionHandler, IAction } from '../types/action';
import { JsonLike } from '../types/json-like';

export interface ConnectionChannelProxyData {
    [field: string]: JsonLike;
}

/**
 * A wrapper for any type of connection that implements a set of methods for exchanging actions
 */
export abstract class BaseConnectionChannel<T extends ConnectionChannelProxyData = ConnectionChannelProxyData> {
    public abstract readonly isConnected: boolean;
    /** Data that will be applied for each action */
    public abstract readonly proxyData: T; // TODO Needed?
    public abstract sendAction(data: IAction, transfer?: Transferable[]): void;
    public abstract addActionHandler<A extends IAction>(handler: ActionHandler<A>): void;
    public abstract removeActionHandler<A extends IAction>(handler: ActionHandler<A>): void;
    /** 
     * To get the best result of receiving a message through the MessagePort,
     * it is preferable to add listeners using the {@link addActionHandler} method
     * before calling this initialization method.
     */
    public abstract run(): void;
    public abstract destroy(saveConnectionOpened?: boolean): void;
    public abstract clone<U extends T = T>(attachableData?: U): BaseConnectionChannel<U>; // TODO Needed?
}

// TODO implements disconnect methods for cases when the Internet connection is lost
