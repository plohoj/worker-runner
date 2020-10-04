import { ConnectionWasClosedError } from "../../errors/runner-errors";
import { TransferableJsonObject } from "../../types/json-object";
import { ConnectControllerAction, IConnectControllerActions } from "../controller/connect-controller.actions";
import { ConnectEnvironmentErrorSerializer } from "./connect-environment-error-serializer";
import { ConnectEnvironmentAction, IConnectEnvironmentAction, IConnectEnvironmentActions, IConnectEnvironmentDestroyedByForceAction, IConnectEnvironmentDestroyedByRequestAction, IConnectEnvironmentDestroyedWithErrorAction, IConnectEnvironmentDisconnectedAction } from "./connect-environment.actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConnectEnvironmentActionsHandler = (action: any) => any;

export interface IConnectEnvironmentConfig{
    actionsHandler: ConnectEnvironmentActionsHandler;
    destroyErrorSerializer: ConnectEnvironmentErrorSerializer;
    destroyHandler: () => Promise<void> | void;
}

export class ConnectEnvironment {
    public readonly connectedPorts = new Map<MessagePort, ConnectEnvironmentActionsHandler>();
    protected readonly destroyErrorSerializer: ConnectEnvironmentErrorSerializer;
    private isDestroyed = false;
    private actionsHandler: ConnectEnvironmentActionsHandler;
    private destroyHandler: () => void;

    constructor(config: IConnectEnvironmentConfig) {
        this.actionsHandler = config.actionsHandler;
        this.destroyHandler = config.destroyHandler;
        this.destroyErrorSerializer = config.destroyErrorSerializer;
    }

    public addPorts(...ports: MessagePort[]): void {
        for (const port of ports) {
            const handler = this.onMessage.bind(this, port);
            port.addEventListener('message', handler);
            port.start();
            this.connectedPorts.set(port, handler);
        }
    }

    public closeConnection(port: MessagePort): void {
        const handler = this.connectedPorts.get(port);
        if (handler) {
            port.removeEventListener('message', handler);
        }
        port.close();
        this.connectedPorts.delete(port);
    }

    protected async forceDestroy(): Promise<void> {
        try {
            await this.destroyHandler();
        } finally {
            const destroyAction: IConnectEnvironmentDestroyedByForceAction = {
                type: ConnectEnvironmentAction.DESTROYED_BY_FORCE,
            };
            for (const [port] of this.connectedPorts) {
                this.sendAction(port, destroyAction);
                this.closeConnection(port);
            }
        }
    }

    protected async onDestroy(port: MessagePort, actionId: number): Promise<void> {
        const handler = this.connectedPorts.get(port);
        this.connectedPorts.delete(port);
        let hasError = false;
        try {
            await this.forceDestroy();
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
        if (handler) { 
            port.removeEventListener('message', handler);
        }
        this.isDestroyed = true;
        port.close();
    }

    protected onDisconnect(port: MessagePort, actionId: number): void {
        if (this.connectedPorts.size <= 1) {
            this.onDestroy(port, actionId)
        }
        const disconnectAction: IConnectEnvironmentDisconnectedAction = {
            id: actionId,
            type: ConnectEnvironmentAction.DISCONNECTED,
        };
        this.sendAction(port, disconnectAction);
        const handler = this.connectedPorts.get(port);
        this.connectedPorts.delete(port);
        if (handler) {
            port.removeEventListener('message', handler);
        }
        port.close();
    }

    protected sendAction(
        port: MessagePort,
        action: IConnectEnvironmentActions
    ): void {
        if (this.isDestroyed) {
            throw new ConnectionWasClosedError();
        }
        const {transfer, ...actionWithoutTransfer} = action as Record<string, TransferableJsonObject>; 
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        port.postMessage(actionWithoutTransfer, transfer as Transferable[]);
    }

    protected async handleAction(
        port: MessagePort,
        actionWithId: IConnectEnvironmentAction | IConnectControllerActions
    ): Promise<void> {
        switch ((actionWithId as IConnectControllerActions).type) {
            case ConnectControllerAction.DISCONNECT:
                this.onDisconnect(port, actionWithId.id);
                break;
            case ConnectControllerAction.DESTROY:
                this.onDestroy(port, actionWithId.id);
                break;
            default: {
                let responseAction: TransferableJsonObject;
                const {id, ...action} = actionWithId;
                try {
                    // TODO stop wait after destroy
                    responseAction = await this.actionsHandler(action) as Record<string, TransferableJsonObject>;
                // eslint-disable-next-line unicorn/prefer-optional-catch-binding
                } catch (error) {
                    // TODO
                    return;
                }
                this.handleCustomActionResponse(port, responseAction, id);
                break;
            }
        }
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
    
    private async onMessage(
        port: MessagePort,
        event: MessageEvent<IConnectEnvironmentAction | IConnectControllerActions>,
    ): Promise<void> {
        this.handleAction(port, event.data)
    }
}
