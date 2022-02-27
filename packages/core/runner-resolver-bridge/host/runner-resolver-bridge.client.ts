import { WorkerRunnerUnexpectedError } from "../../errors/worker-runner-error";
import { RunnerResolverPossibleConnection } from "../../types/possible-connection";
import { IRunnerResolverBridgeClientConnectAction, RunnerResolverBridgeClientAction, IRunnerResolverBridgeClientAction } from "../client/runner-resolver-bridge.client.actions";
import { IRunnerResolverBridgeHostConnectedAction, RunnerResolverBridgeHostAction, IRunnerResolverBridgeHostPongAction, IRunnerResolverBridgeHostPingAction } from "./runner-resolver-bridge.client.actions";

export interface IRunnerResolverBridgeHostBridgeConfigBase {
    newConnectionHandler: (messagePort: MessagePort) => void;
    connections: RunnerResolverPossibleConnection[];
}

export class RunnerResolverBridgeHost {
    private _isRunning = false;
    private onNewConnection: IRunnerResolverBridgeHostBridgeConfigBase['newConnectionHandler'];
    private connections = new Array<RunnerResolverPossibleConnection>();
    private connectionsHandlers = new Map<RunnerResolverPossibleConnection, EventListener>();

    constructor (config: IRunnerResolverBridgeHostBridgeConfigBase) {
        this.onNewConnection = config.newConnectionHandler;
        this.addConnections([...config.connections]);
    }

    public get isRunning(): boolean {
        return this._isRunning;
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
        const pingAction: IRunnerResolverBridgeHostPingAction = { type: RunnerResolverBridgeHostAction.PING };
        connection.postMessage(pingAction);
    }

    private stopListen(connection: RunnerResolverPossibleConnection): void {
        const messageHandler = this.connectionsHandlers.get(connection);
        if (messageHandler) {
            connection.removeEventListener('message', messageHandler);
            this.connectionsHandlers.delete(connection);
        }
    }

    private onMessage(connection: RunnerResolverPossibleConnection, event: MessageEvent): void {
        const action: IRunnerResolverBridgeClientAction = event.data;
        switch (action.type) {
            case RunnerResolverBridgeClientAction.CONNECT:
                this.onConnectAction(action, connection);
                break;
            case RunnerResolverBridgeClientAction.PING:
                this.onPingAction(connection);
                break;
            default:
                throw new WorkerRunnerUnexpectedError({
                    message: 'Unexpected action type in RunnerResolverBridgeHost from RunnerResolverBridgeClient',
                });
                break;
        }
    }

    private onPingAction(connection: RunnerResolverPossibleConnection,): void {
        const pongAction: IRunnerResolverBridgeHostPongAction = {
            type: RunnerResolverBridgeHostAction.PONG,
        }
        connection.postMessage(pongAction);
    }

    private onConnectAction(action: IRunnerResolverBridgeClientConnectAction, connection: RunnerResolverPossibleConnection,): void {
        const messageChannel = new MessageChannel();
        this.onNewConnection(messageChannel.port1);
        const connectedAction: IRunnerResolverBridgeHostConnectedAction = {
            id: action.id,
            type: RunnerResolverBridgeHostAction.CONNECTED,
            port: messageChannel.port2,
        }
        connection.postMessage(connectedAction, [messageChannel.port2]);
    }
}
