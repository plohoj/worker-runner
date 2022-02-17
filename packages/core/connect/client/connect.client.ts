import { WorkerRunnerErrorSerializer } from "../../errors/error.serializer";
import { ConnectionWasClosedError } from "../../errors/runner-errors";
import { WorkerRunnerUnexpectedError } from "../../errors/worker-runner-error";
import { actionLog } from '../../utils/action-log';
import { PromiseListResolver } from "../../utils/promise-list.resolver";
import { ConnectHostAction, IConnectHostActions, IConnectHostCustomErrorAction, IConnectHostCustomResponseAction } from "../host/connect.host.actions";
import { ConnectClientAction, IConnectClientActions, IConnectClientConnectAction, IConnectClientCustomAction, IConnectClientDestroyAction, IConnectClientDisconnectAction, IConnectClientInterruptListeningAction, IConnectCustomAction,  } from "./connect.client.actions";

type DisconnectErrorFactory = (error: ConnectionWasClosedError) => ConnectionWasClosedError;

export interface IConnectClientConfig {
    port: MessagePort,
    errorSerializer: WorkerRunnerErrorSerializer;
    forceDestroyHandler?: () => void;
    disconnectErrorFactory?: DisconnectErrorFactory;
}

export class ConnectClient {
    public readonly port: MessagePort;
    public disconnectStatus?: ConnectionWasClosedError;

    protected readonly promiseListResolver = new PromiseListResolver<IConnectHostActions | IConnectCustomAction>();
    protected readonly disconnectErrorFactory: DisconnectErrorFactory;
    protected readonly errorSerializer: WorkerRunnerErrorSerializer;

    private readonly messageHandler = this.onMessage.bind(this);
    private readonly forceDestroyHandler?: () => void;
    private lastActionId = 0;

    constructor(config: IConnectClientConfig) {
        this.errorSerializer = config.errorSerializer;
        this.forceDestroyHandler = config.forceDestroyHandler;
        this.disconnectErrorFactory = config.disconnectErrorFactory || this.defaultDisconnectErrorFactory;
        this.port = config.port;
        this.port.addEventListener('message', this.messageHandler);
        this.port.start();
        this.sendConnectAction();
    }

    // TODO NEED TEST
    public static disconnectPort(port: MessagePort): Promise<void> {
        return new Promise(resolve => {
            function disconnectHandler(event: MessageEvent): void {
                if ((event.data as IConnectHostActions).type === ConnectHostAction.DISCONNECTED) {
                    actionLog('client-in', event.data);
                    port.removeEventListener('message', disconnectHandler);
                    resolve();
                }
            }
            port.addEventListener('message', disconnectHandler);
            port.start();
            const disconnectAction: IConnectClientDisconnectAction = {
                id: -1,
                type: ConnectClientAction.DISCONNECT,
            }
            actionLog('client-out', disconnectAction);
            port.postMessage(disconnectAction);
        })
    }

    public async destroy(): Promise<void> {
        const destroyAction: Omit<IConnectClientDestroyAction, 'id'> = {
            type: ConnectClientAction.DESTROY,
        };
        try {
            await this.innerSendAction(destroyAction);
        } finally {
            this.stopListen();
        }
    }

    public async disconnect(): Promise<void> {
        const disconnectAction: Omit<IConnectClientDisconnectAction, 'id'> = {
            type: ConnectClientAction.DISCONNECT,
        };
        await this.innerSendAction(disconnectAction);
        this.stopListen();
    }

    public async sendAction<
        O extends IConnectCustomAction,
        I extends IConnectCustomAction,
    >(action: O): Promise<I> {
        const {transfer, ...actionWithoutTransfer} = action; 
        const wrappedAction: Omit<IConnectClientCustomAction, 'id'> = {
            type: ConnectClientAction.CUSTOM,
            payload: actionWithoutTransfer,
        };
        const response: IConnectHostCustomResponseAction | IConnectHostCustomErrorAction
            = await this.innerSendAction(wrappedAction, transfer);
        if (response.type === ConnectHostAction.CUSTOM_RESPONSE) {
            return response.payload as I;
        }
        throw this.errorSerializer.deserialize(response.error);
    }

    /** Stop listening on the port without notifying *ConnectHost* */
    public stopListen(isClosingPort = true): void {
        this.disconnectStatus ||= this.disconnectErrorFactory(new ConnectionWasClosedError());
        this.port.removeEventListener('message', this.messageHandler);
        if (isClosingPort) {
            this.port.close();
        } else {
            const interruptListeningAction: IConnectClientInterruptListeningAction = {
                id: this.resolveActionId(),
                type: ConnectClientAction.INTERRUPT_LISTENING,
            }
            actionLog('client-out', interruptListeningAction);
            this.port.postMessage(interruptListeningAction);
        }
        const promises$ = this.promiseListResolver.promises.values();
        for (const promise of promises$) {
            promise.reject(this.disconnectStatus);
        }
        this.promiseListResolver.promises.clear();
    }

    protected handleAction(action: IConnectHostActions): void {
        actionLog('client-in', action);
        switch (action.type) {
            case ConnectHostAction.DESTROYED_BY_FORCE:
                this.stopListen();
                this.forceDestroyHandler?.();
                break;
            case ConnectHostAction.CUSTOM_ERROR:
            case ConnectHostAction.DESTROYED_WITH_ERROR: {
                const error = this.errorSerializer.deserialize(action.error);
                this.promiseListResolver.reject(action.id, error);
                break;
            }
            case ConnectHostAction.CUSTOM_RESPONSE:
            case ConnectHostAction.DISCONNECTED:
            case ConnectHostAction.DESTROYED_BY_REQUEST: {
                this.promiseListResolver.resolve(action.id, action);
                break;
            }
            default:
                throw new WorkerRunnerUnexpectedError({
                    message: 'Unexpected Action type for Connect Client',
                });
        }
    }

    private innerSendAction<
        O extends Omit<IConnectClientActions, 'id'>,
        I extends IConnectHostActions,
    >(action: O, transfer?: Transferable[]): Promise<I> {
        if (this.disconnectStatus) {
            throw this.disconnectStatus;
        }
        const actionId = this.resolveActionId();
        const actionWidthId = {
            ...action,
            id: actionId,
        } as IConnectClientActions;
        const response$ = this.promiseListResolver.promise(actionId);
        actionLog('client-out', actionWidthId);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.port.postMessage(actionWidthId, transfer!);
        return response$ as unknown as Promise<I>;
    }

    private onMessage(event: MessageEvent<IConnectHostActions>): void {
        this.handleAction(event.data);
    }

    private resolveActionId(): number {
        return this.lastActionId++;
    }

    private defaultDisconnectErrorFactory(this: never, error: ConnectionWasClosedError): ConnectionWasClosedError {
        return error;
    }

    private sendConnectAction(): void {
        const connectAction: IConnectClientConnectAction = {
            type: ConnectClientAction.CONNECT,
        };
        actionLog('client-out', connectAction);
        this.port.postMessage(connectAction);
    }
}
