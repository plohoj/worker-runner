import { WorkerRunnerErrorSerializer } from "../../errors/error.serializer";
import { ConnectionWasClosedError } from "../../errors/runner-errors";
import { WorkerRunnerUnexpectedError } from "../../errors/worker-runner-error";
import { actionLog } from '../../utils/action-log';
import { ConnectClientAction, IConnectClientActions, IConnectClientCustomAction, IConnectCustomAction } from "../client/connect.client.actions";
import { ConnectHostAction, IConnectHostActions, IConnectHostCustomErrorAction, IConnectHostCustomResponseAction, IConnectHostDestroyedByForceAction, IConnectHostDestroyedByRequestAction, IConnectHostDestroyedWithErrorAction, IConnectHostDisconnectedAction } from "./connect.host.actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConnectHostActionsHandler<
    I extends IConnectCustomAction,
    O extends IConnectCustomAction
> = (action: I) => Promise<O>;

const MESSAGE_PORT_CONNECT_HOST_DATA = '__workerRunner_connectHostData';

export interface IListeningInterrupter {
    promise: Promise<void>;
    resolve: () => void;
}

export interface IMessagePortConnectHostData {
    handler: (event: MessageEvent) => void;
    wasConnected: boolean;
    listeningInterrupter: IListeningInterrupter;
} 

interface IMessagePortWithConnectHostData {
    [MESSAGE_PORT_CONNECT_HOST_DATA]?: IMessagePortConnectHostData;
}

export type IConnectHostConfig<
    I extends IConnectCustomAction,
    O extends IConnectCustomAction
> = {
    errorSerializer: WorkerRunnerErrorSerializer;
    actionsHandler: ConnectHostActionsHandler<I, O>;
    destroyHandler: () => Promise<void> | void;
}

export class ConnectHost<
    I extends IConnectCustomAction = IConnectCustomAction,
    O extends IConnectCustomAction = IConnectCustomAction
> {
    public readonly connectedPorts = new Set<MessagePort>();

    protected readonly errorSerializer: WorkerRunnerErrorSerializer;

    private readonly actionsHandler: ConnectHostActionsHandler<I, O>;
    private readonly destroyHandler: () => void;

    constructor(config: IConnectHostConfig<I, O>) {
        this.errorSerializer = config.errorSerializer;
        this.actionsHandler = config.actionsHandler;
        this.destroyHandler = config.destroyHandler;
    }

    public addPort(port: MessagePort): void {
        const handler = this.onMessage.bind(this, port);
        port.addEventListener('message', handler);
        port.start();
        this.createMessagePortData(port, {
            handler,
            wasConnected: false,
            listeningInterrupter: this.buildListeningInterrupter(),
        });
        this.connectedPorts.add(port);
    }

    public closeConnection(port: MessagePort): void {
        const portData = this.getMessagePortData(port);
        const handler = portData?.handler;
        if (handler) {
            port.removeEventListener('message', handler);
        }
        if (portData && !portData.wasConnected) {
            // eslint-disable-next-line no-inner-declarations
            function afterDisconnectHandler() {
                actionLog('host-in', 'afterDisconnectHandler');
                const destroyAction: IConnectHostDestroyedByForceAction = {
                    type: ConnectHostAction.DESTROYED_BY_FORCE,
                };
                actionLog('host-out', destroyAction);
                port.postMessage(destroyAction);
                port.removeEventListener('message', afterDisconnectHandler);
                port.close();
            }
            port.addEventListener('message', afterDisconnectHandler)
        } else {
            port.close();
        }
        this.connectedPorts.delete(port);
        this.deleteMessagePortData(port);
    }

    protected async handleAction(
        port: MessagePort,
        action: IConnectClientActions
    ): Promise<void> {
        actionLog('host-in',  action);
        switch (action.type) {
            case ConnectClientAction.INTERRUPT_LISTENING:
                this.onInterruptListening(port);
                break;
            case ConnectClientAction.DISCONNECT:
                this.onDisconnect(port, action.id);
                break;
            case ConnectClientAction.DESTROY:
                await this.onDestroy(port, action.id);
                break;
            case ConnectClientAction.CUSTOM:
                await this.onCustomAction(port, action);
                break;
            case ConnectClientAction.CONNECT:
                break;
            default:
                throw new WorkerRunnerUnexpectedError({
                    message: 'Unexpected Action type for Connect Host',
                });
        }
    }

    protected async forceDestroy(exceptPort?: MessagePort): Promise<void> {
        try {
            await this.destroyHandler();
        } finally {
            const destroyAction: IConnectHostDestroyedByForceAction = {
                type: ConnectHostAction.DESTROYED_BY_FORCE,
            };
            for (const port of this.connectedPorts) {
                if (port !== exceptPort) {
                    this.sendAction(port, destroyAction);
                    this.closeConnection(port);
                }
            }
        }
    }

    protected onInterruptListening(port: MessagePort): void {
        const portData = this.getMessagePortData(port);
        if (!portData) {
            throw new ConnectionWasClosedError();
        }
        portData.listeningInterrupter.resolve();
        portData.listeningInterrupter = this.buildListeningInterrupter();
        portData.wasConnected = false;
    }
    
    protected onDisconnect(port: MessagePort, actionId: number): void {
        if (this.connectedPorts.size <= 1) {
            this.onDestroy(port, actionId);
            return;
        }
        const disconnectAction: IConnectHostDisconnectedAction = {
            id: actionId,
            type: ConnectHostAction.DISCONNECTED,
        };
        this.sendAction(port, disconnectAction);
        this.closeConnection(port);
    }

    protected async onDestroy(port: MessagePort, actionId: number): Promise<void> {
        let hasError = false;
        try {
            await this.forceDestroy(port);
        } catch(error) {
            hasError = true;
            const errorAction: IConnectHostDestroyedWithErrorAction = {
                id: actionId,
                type: ConnectHostAction.DESTROYED_WITH_ERROR,
                error: this.errorSerializer.serialize(error),
            }
            this.sendAction(port, errorAction);
        }
        if (!hasError) {
            const destroyAction: IConnectHostDestroyedByRequestAction = {
                id: actionId,
                type: ConnectHostAction.DESTROYED_BY_REQUEST,
            };
            this.sendAction(port, destroyAction);
        }
        this.closeConnection(port);
    }

    protected async onCustomAction(port: MessagePort, action: IConnectClientCustomAction): Promise<void> {
        try {
            const portData = this.getMessagePortData(port);
            if (!portData) {
                throw new ConnectionWasClosedError();
            }
            let isListeningInterrupt = false;
            const result = await Promise.race([
                portData.listeningInterrupter.promise.then(() => isListeningInterrupt = true),
                this.actionsHandler(action.payload as I),
            ])
            if (isListeningInterrupt) {
                // Aborting the action because the connection was transfer
                return;
            }
            this.handleCustomActionResponse(port, result as O, action.id);
        } catch (error: unknown) {
            const customErrorAction: IConnectHostCustomErrorAction = {
                id: action.id,
                type: ConnectHostAction.CUSTOM_ERROR,
                error: this.errorSerializer.serialize(error)
            }
            this.sendAction(port, customErrorAction);
        }
    }

    protected sendAction(
        port: MessagePort,
        action: IConnectHostActions,
        transfer?: Transferable[]
    ): void {
        if (!this.connectedPorts.has(port)) {
            throw new ConnectionWasClosedError();
        }
        actionLog('host-out',  action);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        port.postMessage(action, transfer!);
    }

    protected async handleCustomActionResponse (
        port: MessagePort,
        response: O,
        actionId: number,
    ): Promise<void> {
        const {transfer, ...responseWithoutTransfer} = response; 
        const responseAction: IConnectHostCustomResponseAction = {
            id: actionId,
            type: ConnectHostAction.CUSTOM_RESPONSE,
            payload: responseWithoutTransfer,
        };
        this.sendAction(port, responseAction, transfer);
    }

    protected buildListeningInterrupter(): IListeningInterrupter {
        let resolver: IListeningInterrupter['resolve'];
        const promise = new Promise<void>(resolve => {
            resolver = resolve;
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return {promise, resolve: resolver!};
    }

    protected createMessagePortData(port: MessagePort, data: IMessagePortConnectHostData): void {
        (port as unknown as IMessagePortWithConnectHostData)[MESSAGE_PORT_CONNECT_HOST_DATA] = data;
    }

    protected getMessagePortData(port: MessagePort): IMessagePortConnectHostData | undefined {
        return (port as unknown as IMessagePortWithConnectHostData)[MESSAGE_PORT_CONNECT_HOST_DATA];
    }

    protected deleteMessagePortData(port: MessagePort): void {
        (port as unknown as IMessagePortWithConnectHostData)[MESSAGE_PORT_CONNECT_HOST_DATA] = undefined;
    }
    
    private async onMessage(
        port: MessagePort,
        event: MessageEvent<IConnectClientActions>,
    ): Promise<void> {
        const portData = this.getMessagePortData(port);
        if (portData) {
            portData.wasConnected = true;
        }
        this.handleAction(port, event.data)
    }
}
