import { ActionHandler, IAction } from '../types/action';
import { IActionTarget } from '../types/action-target';
import { ConnectionChannelProxyData } from './proxy.connection-channel';

/**
 * A wrapper for any type of connection that implements a set of methods for exchanging actions
 */
export abstract class BaseConnectionChannel implements IActionTarget {

    protected readonly handlers = new Set<ActionHandler>();
    protected saveConnectionOpened = false;

    /** {proxyField: {proxyValue: {proxyChannel}}} */
    private readonly proxyChannels = new Map<
        ConnectionChannelProxyData[0],
        Map<
            ConnectionChannelProxyData[1],
            Set<BaseConnectionChannel> // TODO Set needed?
        >
    >();
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
        originalChannel.addProxyChannel(proxyData, proxyChannel);
        return () => originalChannel.removeProxyChannel(proxyData, proxyChannel);
    }

    /** 
     * To get the best result of receiving a message through the MessagePort,
     * it is preferable to add listeners using the {@link addActionHandler} method
     * before calling this initialization method.
     */
    public run(): void {
        this._isConnected = true;
        this.isDestroyed = false;
        this.saveConnectionOpened = false;
    }

    /** 
     * If the connection has a proxy, then the connection will not be terminated until all proxies are destroyed.
     */
    public destroy(saveConnectionOpened = false): void {
        this._isConnected = false;
        this.isDestroyed = true;
        this.saveConnectionOpened = saveConnectionOpened;
        this.handlers.clear();
        if (this.proxyChannels.size === 0) {
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
        for (const [proxyField, valueHandlerMap] of this.proxyChannels) {
            // TODO Maybe it's better to use the filtering method in the proxy instance?
            if (proxyField in action) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                const {[proxyField]: _, ...originalAction} = action as Record<any, any>;
                for (const [proxyValue, proxyChannelSet] of valueHandlerMap) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (proxyValue === (action as Record<any, any>)[proxyField]) {
                        for (const proxiedChannel of proxyChannelSet) {
                            proxiedChannel.actionHandler(originalAction as IAction);
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

    private addProxyChannel(proxyData: ConnectionChannelProxyData, proxyChannel: BaseConnectionChannel): void {
        let valueHandlerMap = this.proxyChannels.get(proxyData[0]);
        if (!valueHandlerMap) {
            valueHandlerMap = new Map();
            this.proxyChannels.set(proxyData[0], valueHandlerMap);
        }
        let handlerSet = valueHandlerMap.get(proxyData[1]);
        if (!handlerSet) {
            handlerSet = new Set();
            valueHandlerMap.set(proxyData[1], handlerSet);
        }
        handlerSet.add(proxyChannel);
    }

    private removeProxyChannel(proxyData: ConnectionChannelProxyData, proxyChannel: BaseConnectionChannel): void {
        const valueHandlerMap = this.proxyChannels.get(proxyData[0]);
        const handlerSet = valueHandlerMap?.get(proxyData[1]);
        if (!handlerSet?.delete(proxyChannel)) {
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
        this.proxyChannels.delete(proxyData[0])
        if (this.isDestroyed && this.proxyChannels.size === 0) {
            this.afterDestroy();
        }
    }

    public abstract sendAction(data: IAction, transfer?: Transferable[]): void;
    protected abstract afterDestroy(): void;
}

// TODO implements disconnect methods for cases when the Internet connection is lost
