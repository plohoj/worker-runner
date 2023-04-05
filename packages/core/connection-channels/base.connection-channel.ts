import { ConnectionChannelInterceptorsComposer } from '../connection-channel-interceptor/connection-channel-interceptors-composer';
import { ActionHandler, IAction } from '../types/action';
import { EventHandlerController } from '../utils/event-handler-controller';

/**
 * A wrapper for any type of connection that implements a set of methods for exchanging actions
 */
export abstract class BaseConnectionChannel {

    public readonly actionHandlerController = new EventHandlerController<IAction>();
    public readonly destroyEndHandlerController = new EventHandlerController<void>();
    public readonly interceptorsComposer = new ConnectionChannelInterceptorsComposer({
        connectionChannel: this,
    });
    protected saveConnectionOpened = false;

    private _isConnected = false;
    private destroyProcess$?: void | Promise<void>;

    public get isConnected() {
        return this._isConnected;
    }

    /** 
     * To get the best result of receiving a message through the MessagePort,
     * it is preferable to add listeners using the {@link actionHandlerController}
     * before calling this initialization method.
     */
    public run(): void {
        this._isConnected = true;
        this.saveConnectionOpened = false;
    }

    public sendAction(action: IAction, transfer?: Transferable[]): void {
        const interceptResult = this.interceptorsComposer.interceptSend(action);
        if (interceptResult.rejected) {
            return;
        }
        this.nativeSendAction(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            interceptResult.action!,
            transfer
        );
    }

    /** 
     * If the connection has a proxy, then the connection will not be terminated until all proxies are destroyed.
     */
    public destroy(saveConnectionOpened = false): void {
        this._isConnected = false;
        this.saveConnectionOpened = saveConnectionOpened;
        this.actionHandlerController.clear();
        if (this.destroyProcess$) {
            return;
        }
        this.destroyProcess$ = this.interceptorsComposer.destroy();
        if (this.destroyProcess$) {
            void this.destroyProcess$.finally(() => {
                this.destroyProcess$ = undefined;
                this.afterDestroy();
            });
        } else {
            this.afterDestroy();
        }
    }

    public readonly actionHandler: ActionHandler = (action: IAction): void => {
        const interceptResult = this.interceptorsComposer.interceptReceive(action);
        if (interceptResult.rejected) {
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.actionHandlerController.dispatch(interceptResult.action!);
    }

    protected afterDestroy(): void {
        this.destroyEndHandlerController.dispatch();
        this.destroyEndHandlerController.clear();
    }

    protected abstract nativeSendAction(action: IAction, transfer?: Transferable[]): void;
}

// TODO implements disconnect methods for cases when the Internet connection is lost
