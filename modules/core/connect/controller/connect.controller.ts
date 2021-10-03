import { WorkerRunnerErrorSerializer } from "../../errors/error.serializer";
import { ConnectionWasClosedError } from "../../errors/runner-errors";
import { WorkerRunnerUnexpectedError } from "../../errors/worker-runner-error";
import { PromiseListResolver } from "../../utils/promise-list.resolver";
import { ConnectEnvironmentAction, IConnectEnvironmentActions, IConnectEnvironmentCustomErrorAction, IConnectEnvironmentCustomResponseAction } from "../environment/connect-environment.actions";
import { ConnectControllerAction, IConnectControllerActions, IConnectControllerConnectAction, IConnectControllerCustomAction, IConnectControllerDestroyAction, IConnectControllerDisconnectAction, IConnectControllerInterruptListeningAction, IConnectCustomAction,  } from "./connect-controller.actions";

type DisconnectErrorFactory = (error: ConnectionWasClosedError) => ConnectionWasClosedError;

export interface IConnectControllerConfig {
    port: MessagePort,
    errorSerializer: WorkerRunnerErrorSerializer;
    forceDestroyHandler?: () => void;
    disconnectErrorFactory?: DisconnectErrorFactory;
}

export class ConnectController {
    public readonly port: MessagePort;
    public disconnectStatus?: ConnectionWasClosedError;

    protected readonly promiseListResolver = new PromiseListResolver<IConnectEnvironmentActions | IConnectCustomAction>();
    protected readonly disconnectErrorFactory: DisconnectErrorFactory;
    protected readonly errorSerializer: WorkerRunnerErrorSerializer;

    private readonly messageHandler = this.onMessage.bind(this);
    private readonly forceDestroyHandler?: () => void;
    private lastActionId = 0;

    constructor(config: IConnectControllerConfig) {
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
                if ((event.data as IConnectEnvironmentActions).type === ConnectEnvironmentAction.DISCONNECTED) {
                    port.removeEventListener('message', disconnectHandler);
                    resolve();
                }
            }
            port.addEventListener('message', disconnectHandler);
            port.start();
            const disconnectAction: IConnectControllerDisconnectAction = {
                id: -1,
                type: ConnectControllerAction.DISCONNECT,
            }
            port.postMessage(disconnectAction)
        })
    }

    public async destroy(): Promise<void> {
        const destroyAction: Omit<IConnectControllerDestroyAction, 'id'> = {
            type: ConnectControllerAction.DESTROY,
        };
        try {
            await this.innerSendAction(destroyAction);
        } finally {
            this.stopListen();
        }
    }

    public async disconnect(): Promise<void> {
        const disconnectAction: Omit<IConnectControllerDisconnectAction, 'id'> = {
            type: ConnectControllerAction.DISCONNECT,
        };
        await this.innerSendAction(disconnectAction);
        this.stopListen();
    }

    public async sendAction<
        O extends IConnectCustomAction,
        I extends IConnectCustomAction,
    >(action: O): Promise<I> {
        const {transfer, ...actionWithoutTransfer} = action; 
        const wrappedAction: Omit<IConnectControllerCustomAction, 'id'> = {
            type: ConnectControllerAction.CUSTOM,
            payload: actionWithoutTransfer,
        };
        const response: IConnectEnvironmentCustomResponseAction | IConnectEnvironmentCustomErrorAction
            = await this.innerSendAction(wrappedAction, transfer);
        if (response.type === ConnectEnvironmentAction.CUSTOM_RESPONSE) {
            return response.payload as I;
        }
        throw this.errorSerializer.deserialize(response.error);
    }

    /** Stop listening on the port without notifying *ConnectEnvironment* */
    public stopListen(isClosingPort = true): void {
        this.disconnectStatus ||= this.disconnectErrorFactory(new ConnectionWasClosedError());
        this.port.removeEventListener('message', this.messageHandler);
        if (isClosingPort) {
            this.port.close();
        } else {
            const interruptListeningAction: IConnectControllerInterruptListeningAction = {
                id: this.resolveActionId(),
                type: ConnectControllerAction.INTERRUPT_LISTENING,
            }
            this.port.postMessage(interruptListeningAction);
        }
        const promises$ = this.promiseListResolver.promises.values();
        for (const promise of promises$) {
            promise.reject(this.disconnectStatus);
        }
        this.promiseListResolver.promises.clear();
    }

    protected handleAction(action: IConnectEnvironmentActions): void {
        switch (action.type) {
            case ConnectEnvironmentAction.DESTROYED_BY_FORCE:
                this.stopListen();
                this.forceDestroyHandler?.();
                break;
            case ConnectEnvironmentAction.CUSTOM_ERROR:
            case ConnectEnvironmentAction.DESTROYED_WITH_ERROR: {
                const error = this.errorSerializer.deserialize(action.error);
                this.promiseListResolver.reject(action.id, error);
                break;
            }
            case ConnectEnvironmentAction.CUSTOM_RESPONSE:
            case ConnectEnvironmentAction.DISCONNECTED:
            case ConnectEnvironmentAction.DESTROYED_BY_REQUEST: {
                this.promiseListResolver.resolve(action.id, action);
                break;
            }
            default:
                throw new WorkerRunnerUnexpectedError({
                    message: 'Unexpected Action type for Connect Controller',
                });
        }
    }

    private innerSendAction<
        O extends Omit<IConnectControllerActions, 'id'>,
        I extends IConnectEnvironmentActions,
    >(action: O, transfer?: Transferable[]): Promise<I> {
        if (this.disconnectStatus) {
            throw this.disconnectStatus;
        }
        const actionId = this.resolveActionId();
        const actionWidthId = {
            ...action,
            id: actionId,
        } as IConnectControllerActions;
        const response$ = this.promiseListResolver.promise(actionId);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.port.postMessage(actionWidthId, transfer!);
        return response$ as unknown as Promise<I>;
    }

    private onMessage(event: MessageEvent<IConnectEnvironmentActions>): void {
        this.handleAction(event.data);
    }

    private resolveActionId(): number {
        return this.lastActionId++;
    }

    private defaultDisconnectErrorFactory(this: never, error: ConnectionWasClosedError): ConnectionWasClosedError {
        return error;
    }

    private sendConnectAction(): void {
        const connectAction: IConnectControllerConnectAction = {
            type: ConnectControllerAction.CONNECT,
        };
        this.port.postMessage(connectAction);
    }
}
