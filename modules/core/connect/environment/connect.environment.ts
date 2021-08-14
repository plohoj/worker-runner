import { WorkerRunnerErrorSerializer } from "../../errors/error.serializer";
import { ConnectionWasClosedError } from "../../errors/runner-errors";
import { WorkerRunnerUnexpectedError } from "../../errors/worker-runner-error";
import { ConnectControllerAction, IConnectControllerActions, IConnectControllerCustomAction, IConnectCustomAction } from "../controller/connect-controller.actions";
import { ConnectEnvironmentAction, IConnectEnvironmentActions, IConnectEnvironmentCustomErrorAction, IConnectEnvironmentCustomResponseAction, IConnectEnvironmentDestroyedByForceAction, IConnectEnvironmentDestroyedByRequestAction, IConnectEnvironmentDestroyedWithErrorAction, IConnectEnvironmentDisconnectedAction } from "./connect-environment.actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConnectEnvironmentActionsHandler<
    I extends IConnectCustomAction,
    O extends IConnectCustomAction
> = (action: I) => Promise<O>;

const MESSAGE_PORT_CONNECT_ENVIRONMENT_DATA = '__workerRunner_connectEnvironmentData';

export interface IListeningInterrupter {
    promise: Promise<void>;
    resolve: () => void;
}

export interface IMessagePortConnectEnvironmentData {
    handler: (event: MessageEvent) => void;
    listeningInterrupter: IListeningInterrupter;
} 

interface IMessagePortWithConnectEnvironmentData {
    [MESSAGE_PORT_CONNECT_ENVIRONMENT_DATA]?: IMessagePortConnectEnvironmentData;
}

export type IConnectEnvironmentConfig<
    I extends IConnectCustomAction,
    O extends IConnectCustomAction
> = {
    errorSerializer: WorkerRunnerErrorSerializer;
    actionsHandler: ConnectEnvironmentActionsHandler<I, O>;
    destroyHandler: () => Promise<void> | void;
}

export class ConnectEnvironment<
    I extends IConnectCustomAction = IConnectCustomAction,
    O extends IConnectCustomAction = IConnectCustomAction
> {
    public readonly connectedPorts = new Set<MessagePort>();

    protected readonly errorSerializer: WorkerRunnerErrorSerializer;

    private readonly actionsHandler: ConnectEnvironmentActionsHandler<I, O>;
    private readonly destroyHandler: () => void;

    constructor(config: IConnectEnvironmentConfig<I, O>) {
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
        action: IConnectControllerActions
    ): Promise<void> {
        switch (action.type) {
            case ConnectControllerAction.INTERRUPT_LISTENING:
                this.onInterruptListening(port);
                break;
            case ConnectControllerAction.DISCONNECT:
                this.onDisconnect(port, action.id);
                break;
            case ConnectControllerAction.DESTROY:
                await this.onDestroy(port, action.id);
                break;
            case ConnectControllerAction.CUSTOM:
                await this.onCustomAction(port, action);
                break;
            default:
                throw new WorkerRunnerUnexpectedError({
                    message: 'Unexpected Action type for Connect Environment',
                });
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
                error: this.errorSerializer.serialize(error),
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

    protected async onCustomAction(port: MessagePort, action: IConnectControllerCustomAction): Promise<void> {
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
                // Aborting the action because the connection was closed
                return;
            }
            this.handleCustomActionResponse(port, result as O, action.id);
        } catch (error: unknown) {
            const customErrorAction: IConnectEnvironmentCustomErrorAction = {
                id: action.id,
                type: ConnectEnvironmentAction.CUSTOM_ERROR,
                error: this.errorSerializer.serialize(error)
            }
            this.sendAction(port, customErrorAction);
        }
    }

    protected sendAction(
        port: MessagePort,
        action: IConnectEnvironmentActions,
        transfer?: Transferable[]
    ): void {
        if (!this.connectedPorts.has(port)) {
            throw new ConnectionWasClosedError();
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        port.postMessage(action, transfer!);
    }

    protected async handleCustomActionResponse (
        port: MessagePort,
        response: O,
        actionId: number,
    ): Promise<void> {
        const {transfer, ...responseWithoutTransfer} = response; 
        const responseAction: IConnectEnvironmentCustomResponseAction = {
            id: actionId,
            type: ConnectEnvironmentAction.CUSTOM_RESPONSE,
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
        event: MessageEvent<IConnectControllerActions>,
    ): Promise<void> {
        this.handleAction(port, event.data)
    }
}
