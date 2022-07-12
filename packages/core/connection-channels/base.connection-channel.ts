import { JsonLike } from '..';
import { ActionHandler, IAction } from '../types/action';
import { ConnectionChannelProxyData } from './proxy.connection-channel';

/**
 * A wrapper for any type of connection that implements a set of methods for exchanging actions
 */
export abstract class BaseConnectionChannel {

    protected readonly handlers = new Set<ActionHandler>();
    protected saveConnectionOpened = false;

    /** {proxyField: {proxyValue: {actinHandler}}} */
    private readonly proxyHandlers = new Map<string, Map<JsonLike, Set<ActionHandler>>>();
    private _isConnected = false;
    private isDestroyed = false;

    public get isConnected() {
        return this._isConnected;
    }

    /**
     * @return The function that will be called after the proxy channel has been successfully destroyed,
     * to clean up handlers.
     */
    protected static attachProxy(
        originalChannel: BaseConnectionChannel,
        proxyData: ConnectionChannelProxyData,
        proxyChannel: BaseConnectionChannel,
    ): () => void {
        originalChannel.addProxyHandler(proxyData, proxyChannel.actionHandler);
        return () => originalChannel.removeProxyHandler(proxyData, proxyChannel.actionHandler);
    }

    /** 
     * To get the best result of receiving a message through the MessagePort,
     * it is preferable to add listeners using the {@link addActionHandler} method
     * before calling this initialization method.
     */
    public run(): void{
        this.saveConnectionOpened = false;
        this._isConnected = true;
    }

    /** 
     * If the connection has a proxy, then the connection will not be terminated until all proxies are destroyed.
     */
    public destroy(saveConnectionOpened = false): void{
        this._isConnected = false;
        this.isDestroyed = true;
        this.saveConnectionOpened = saveConnectionOpened;
        this.handlers.clear();
        if (this.proxyHandlers.size === 0) {
            this.afterDestroy();
        }
    }

    public addActionHandler<A extends IAction>(handler: ActionHandler<A>): void {
        this.handlers.add(handler as ActionHandler);
    }

    public removeActionHandler<A extends IAction>(handler: ActionHandler<A>): void {
        this.handlers.delete(handler as ActionHandler);
    }

    protected readonly actionHandler: ActionHandler = (action: IAction): void => {
        for (const [proxyField, valueHandlerMap] of this.proxyHandlers) {
            if (proxyField in action) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                const {[proxyField]: _, ...originalAction} = action as Record<any, any>;
                for (const [proxyValue, handlersSet] of valueHandlerMap) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (proxyValue === (action as Record<any, any>)[proxyField]) {
                        for (const handler of handlersSet) {
                            handler(originalAction as IAction);
                        }
                    }
                }
                return;
            }
        }
        for (const handler of this.handlers) {
            handler(action);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected afterDestroy(): void {
        this.proxyHandlers.clear();
    }

    private addProxyHandler(proxyData: ConnectionChannelProxyData, handler: ActionHandler): void {
        let valueHandlerMap = this.proxyHandlers.get(proxyData[0]);
        if (!valueHandlerMap) {
            valueHandlerMap = new Map();
            this.proxyHandlers.set(proxyData[0], valueHandlerMap);
        }
        let handlerSet = valueHandlerMap.get(proxyData[1]);
        if (!handlerSet) {
            handlerSet = new Set();
            valueHandlerMap.set(proxyData[1], handlerSet);
        }
        handlerSet.add(handler);
    }

    private removeProxyHandler(proxyData: ConnectionChannelProxyData, handler: ActionHandler): void {
        const valueHandlerMap = this.proxyHandlers.get(proxyData[0]);
        const handlerSet = valueHandlerMap?.get(proxyData[1]);
        if (!handlerSet?.delete(handler)) {
            return;
        }
        if (handlerSet.size > 0) {
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        valueHandlerMap!.delete(proxyData[1]);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (valueHandlerMap!.size > 0) {
            return;
        }
        this.proxyHandlers.delete(proxyData[0])
        if (this.isDestroyed && this.proxyHandlers.size === 0) {
            this.afterDestroy();
        }
    }

    public abstract sendAction(data: IAction, transfer?: Transferable[]): void;
}

// TODO implements disconnect methods for cases when the Internet connection is lost
