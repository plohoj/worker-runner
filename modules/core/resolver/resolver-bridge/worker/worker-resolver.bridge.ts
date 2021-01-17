import { WorkerRunnerUnexpectedError } from "../../../errors/worker-runner-error";
import { RunnerResolverPossibleConnection } from "../../../types/possible-connection";
import { IResolverBridgeConnectAction, ResolverBridgeAction } from "../node/resolver-bridge.actions";
import { IWorkerResolverBridgeConnectedAction, WorkerResolverBridgeAction } from "./worker-resolver-bridge.actions";

export interface IBaseWorkerResolverBridgeConfig {
    newConnectionHandler: (messagePort: MessagePort) => void;
    connections: RunnerResolverPossibleConnection[];
}

export class WorkerResolverBridge {

    public get isRunning(): boolean {
        return this._isRunning;
    }

    private _isRunning = false;
    private onNewConnection: IBaseWorkerResolverBridgeConfig['newConnectionHandler'];
    private connections = new Array<RunnerResolverPossibleConnection>();
    private connectionsHandlers = new Map<RunnerResolverPossibleConnection, EventListener>();

    constructor (config: IBaseWorkerResolverBridgeConfig) {
        this.onNewConnection = config.newConnectionHandler;
        this.addConnections(config.connections.slice());
    }

    public run(): void {
        for (const connection of this.connections) {
            this.startListen(connection);
        }
        this._isRunning = true;
    }

    public addConnections(connections: RunnerResolverPossibleConnection[]): void {
        if (this.isRunning) {
            for (const connection of connections) {
                this.startListen(connection);
            }
        }
        this.connections.push(...connections);
    }

    public removeConnections(connections: RunnerResolverPossibleConnection[]): void {
        for (const connection of connections) {
            const connectionIndex = this.connections.indexOf(connection);
            if (connectionIndex !== -1) {
                this.stopListen(connection);
                this.connections.splice(connectionIndex, 1);
            }
        }
    }

    public destroy(): void {
        for (const connection of this.connections) {
            this.stopListen(connection);
        }
        this._isRunning = false;
    }

    private startListen(connection: RunnerResolverPossibleConnection): void {
        const messageHandler = this.onMessage.bind(this, connection) as EventListener;
        connection.addEventListener('message',  messageHandler);
        this.connectionsHandlers.set(connection, messageHandler);
    }

    private stopListen(connection: RunnerResolverPossibleConnection): void {
        const messageHandler = this.connectionsHandlers.get(connection);
        if (messageHandler) {
            connection.removeEventListener('message', messageHandler);
            this.connectionsHandlers.delete(connection);
        }
    }

    private onMessage(connection: RunnerResolverPossibleConnection, event: MessageEvent): void {
        const action: IResolverBridgeConnectAction = event.data;
        if (action.type === ResolverBridgeAction.CONNECT) {
            const messageChannel = new MessageChannel();
            this.onNewConnection(messageChannel.port1);
            const connectedAction: IWorkerResolverBridgeConnectedAction = {
                id: action.id,
                type: WorkerResolverBridgeAction.CONNECTED,
                port: messageChannel.port2,
            }
            connection.postMessage(connectedAction, [messageChannel.port2]);
        } else {
            throw new WorkerRunnerUnexpectedError({
                message: 'Unexpected action type in Worker resolver Bridge from Node resolver Bridge',
            });
        }
    }
}
