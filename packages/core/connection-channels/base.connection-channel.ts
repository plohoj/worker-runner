import { ConnectionChannelInterceptorsComposer } from '../connection-channel-interceptor/connection-channel-interceptors-composer';
import { DisconnectReason } from '../connections/base/disconnect-reason';
import { ActionHandler, IAction } from '../types/action';
import { EventHandlerController } from '../utils/event-handler-controller';

export interface IBaseConnectionChannelDestroyOptions {
    saveConnectionOpened?: boolean;
    disconnectReason: DisconnectReason;
}

/** A wrapper for any type of connection that implements a set of methods for exchanging actions */
export interface IBaseConnectionChannel {
    readonly actionHandlerController: EventHandlerController<IAction>;
    /** the event that indicates the start of the process of destroying the connection */
    readonly destroyStartHandlerController: EventHandlerController<DisconnectReason>;
    /**
     * The event indicating that the connection destruction process is complete,
     * including destruction of all Interceptor plugins and proxies
     */
    readonly destroyFinishHandlerController: EventHandlerController<DisconnectReason>;
    readonly interceptorsComposer: ConnectionChannelInterceptorsComposer;
    /**
     * Indicates the reason of the disconnection.
     * If field has no value, the connection has been established and is active
     */
    readonly disconnectReason?: DisconnectReason;

    actionHandler: ActionHandler;
    /** 
     * To get the best result of receiving a message through the MessagePort,
     * it is preferable to add listeners using the {@link actionHandlerController}
     * before calling this initialization method.
     */
    run(): void;
    sendAction(action: IAction, transfer?: Transferable[]): void;
    /** If the connection has a proxy, then the connection will not be terminated until all proxies are destroyed. */
    destroy(options: IBaseConnectionChannelDestroyOptions): void;
}

/** A wrapper for any type of connection that implements a set of methods for exchanging actions */
export abstract class BaseConnectionChannel implements IBaseConnectionChannel {

    public readonly actionHandlerController = new EventHandlerController<IAction>();
    public readonly destroyStartHandlerController = new EventHandlerController<DisconnectReason>();
    public readonly destroyFinishHandlerController = new EventHandlerController<DisconnectReason>();
    public readonly interceptorsComposer: ConnectionChannelInterceptorsComposer
        = new ConnectionChannelInterceptorsComposer({ connectionChannel: this });
    public disconnectReason?: DisconnectReason = DisconnectReason.ConnectionNotYetEstablished;

    protected saveConnectionOpened = false;

    private destroyProcess$?: void | Promise<void>;

    public run(): void {
        this.disconnectReason = undefined;
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

    public destroy(options: IBaseConnectionChannelDestroyOptions): void {
        this.disconnectReason = options.disconnectReason;
        this.saveConnectionOpened = options?.saveConnectionOpened || false;
        this.actionHandlerController.clear();
        if (this.destroyProcess$) {
            return;
        }
        this.destroyStartHandlerController.dispatch(options.disconnectReason);
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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.destroyFinishHandlerController.dispatch(this.disconnectReason!);
        this.destroyFinishHandlerController.clear();
    }

    protected abstract nativeSendAction(action: IAction, transfer?: Transferable[]): void;
}
