import { ConnectionWasClosedError } from "../../errors/runner-errors";
import { TransferableJsonObject } from "../../types/json-object";
import { ConnectControllerAction, IConnectControllerAction, IConnectControllerActions } from "../controller/connect-controller.actions";
import { ConnectEnvironmentErrorSerializer } from "./connect-environment-error-serializer";
import { ConnectEnvironmentAction, IConnectEnvironmentAction, IConnectEnvironmentActions, IConnectEnvironmentDestroyedByForceAction, IConnectEnvironmentDestroyedByRequestAction, IConnectEnvironmentDestroyedWithErrorAction, IConnectEnvironmentDisconnectedAction } from "./connect-environment.actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConnectEnvironmentActionsHandler = (action: any) => any;

const MESSAGE_PORT_CONNECT_ENVIRONMENT_DATA = '__workerRunner_connectEnvironmentData';

export interface IListeningInterrupter {
    promise: Promise<void>;
    resolve: () => void;
}

export interface IMessagePortConnectEnvironmentData {
    handler: ConnectEnvironmentActionsHandler;
    listeningInterrupter: IListeningInterrupter;
} 

interface IMessagePortWithConnectEnvironmentData {
    [MESSAGE_PORT_CONNECT_ENVIRONMENT_DATA]?: IMessagePortConnectEnvironmentData;
}

export interface IConnectEnvironmentConfig{
    actionsHandler: ConnectEnvironmentActionsHandler;
    destroyErrorSerializer: ConnectEnvironmentErrorSerializer;
    destroyHandler: () => Promise<void> | void;
}

export class ConnectEnvironment {
    public readonly connectedPorts = new Set<MessagePort>();
    protected readonly destroyErrorSerializer: ConnectEnvironmentErrorSerializer;
    private actionsHandler: ConnectEnvironmentActionsHandler;
    private destroyHandler: () => void;

    constructor(config: IConnectEnvironmentConfig) {
        this.actionsHandler = config.actionsHandler;
        this.destroyHandler = config.destroyHandler;
        this.destroyErrorSerializer = config.destroyErrorSerializer;
    }

    public addPort(port: MessagePort): void {
        const handler = this.onMessage.bind(this, port);
        port.addEventListener('message', handler);
        port.start();
        this.createMessagePortData(port, {
            handler,
            listeningInterrupter: this.buildListeningInterrupter(),
        });
        this.connectedPorts.add(port);
    }

    public closeConnection(port: MessagePort): void {
        const handler = this.getMessagePortData(port)?.handler;
        if (handler) {
            port.removeEventListener('message', handler);
        }
        port.close();
        this.connectedPorts.delete(port);
        this.deleteMessagePortData(port);
    }

    protected async handleAction(
        port: MessagePort,
        actionWithId: IConnectControllerAction | IConnectControllerActions
    ): Promise<void> {
        switch ((actionWithId as IConnectControllerActions).type) {
            case ConnectControllerAction.INTERRUPT_LISTENING:
                this.onInterruptListening(port);
                break;
            case ConnectControllerAction.DISCONNECT:
                this.onDisconnect(port, actionWithId.id);
                break;
            case ConnectControllerAction.DESTROY:
                await this.onDestroy(port, actionWithId.id);
                break;
            default: 
                await this.onCustomAction(port, actionWithId as IConnectControllerAction);
                break;
        }
    }

    protected async forceDestroy(exceptPort?: MessagePort): Promise<void> {
        try {
            await this.destroyHandler();
        } finally {
            const destroyAction: IConnectEnvironmentDestroyedByForceAction = {
                type: ConnectEnvironmentAction.DESTROYED_BY_FORCE,
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
        const listeningInterrupter = this.buildListeningInterrupter();
        portData.listeningInterrupter = listeningInterrupter;
    }
    
    protected onDisconnect(port: MessagePort, actionId: number): void {
        if (this.connectedPorts.size <= 1) {
            this.onDestroy(port, actionId);
            return;
        }
        const disconnectAction: IConnectEnvironmentDisconnectedAction = {
            id: actionId,
            type: ConnectEnvironmentAction.DISCONNECTED,
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
            const errorAction: IConnectEnvironmentDestroyedWithErrorAction = {
                id: actionId,
                type: ConnectEnvironmentAction.DESTROYED_WITH_ERROR,
                error: this.destroyErrorSerializer(error),
            }
            this.sendAction(port, errorAction);
        }
        if (!hasError) {
            const destroyAction: IConnectEnvironmentDestroyedByRequestAction = {
                id: actionId,
                type: ConnectEnvironmentAction.DESTROYED_BY_REQUEST,
            };
            this.sendAction(port, destroyAction);
        }
        this.closeConnection(port);
    }

    protected async onCustomAction(port: MessagePort, actionWithId: IConnectControllerAction): Promise<void> {
        const {id, ...action} = actionWithId;
        const portData = this.getMessagePortData(port);
        if (!portData) {
            throw new ConnectionWasClosedError();
        }
        let isListeningInterrupt = false;
        const result = await Promise.race([
            portData.listeningInterrupter.promise.then(() => isListeningInterrupt = true),
            this.actionsHandler(action) as Record<string, TransferableJsonObject>
        ])
        if (isListeningInterrupt) {
            // Aborting the action because the connection was closed
            return;
        }
        this.handleCustomActionResponse(port, result as Record<string, TransferableJsonObject>, id);
    }

    protected sendAction(
        port: MessagePort,
        action: IConnectEnvironmentActions
    ): void {
        if (!this.connectedPorts.has(port)) {
            throw new ConnectionWasClosedError();
        }
        const {transfer, ...actionWithoutTransfer} = action as Record<string, TransferableJsonObject>;
        port.postMessage(actionWithoutTransfer, transfer as Transferable[]);
    }

    protected async handleCustomActionResponse (
        port: MessagePort,
        response: Record<string, TransferableJsonObject>,
        actionId: number,
    ): Promise<void> {
        const responseActionWithId = {
            ...response,
            id: actionId,
        };
        this.sendAction(port, responseActionWithId as IConnectEnvironmentActions);
    }

    protected handleResponse(
        response: Record<string, TransferableJsonObject>
    ): Record<string, TransferableJsonObject> | IConnectEnvironmentAction {
        return response;
    }

    protected buildListeningInterrupter(): IListeningInterrupter {
        let resolver: IListeningInterrupter['resolve'];
        const promise = new Promise<void>(resolve => {
            resolver = resolve;
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return {promise, resolve: resolver!};
    }

    protected createMessagePortData(port: MessagePort, data: IMessagePortConnectEnvironmentData): void {
        (port as unknown as IMessagePortWithConnectEnvironmentData)[MESSAGE_PORT_CONNECT_ENVIRONMENT_DATA] = data;
    }

    protected getMessagePortData(port: MessagePort): IMessagePortConnectEnvironmentData | undefined {
        return (port as unknown as IMessagePortWithConnectEnvironmentData)[MESSAGE_PORT_CONNECT_ENVIRONMENT_DATA];
    }

    protected deleteMessagePortData(port: MessagePort): void {
        (port as unknown as IMessagePortWithConnectEnvironmentData)[MESSAGE_PORT_CONNECT_ENVIRONMENT_DATA] = undefined;
    }
    
    private async onMessage(
        port: MessagePort,
        event: MessageEvent<IConnectEnvironmentAction | IConnectControllerActions>,
    ): Promise<void> {
        this.handleAction(port, event.data)
    }
}
