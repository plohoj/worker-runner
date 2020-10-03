import { IResolverBridgeConnectAction, ResolverBridgeAction } from "../node/resolver-bridge.actions";
import { IBaseWorkerResolverBridge, IBaseWorkerResolverBridgeConfig } from "./base-worker-resolver.bridge";
import { IWorkerResolverBridgeConnectedAction, WorkerResolverBridgeAction } from "./worker-resolver-bridge.actions";

export class WorkerResolverBridge implements IBaseWorkerResolverBridge {

    private messageHandler = this.onMessage.bind(this);
    private onNewConnection: IBaseWorkerResolverBridgeConfig['newConnectionHandler'];

    constructor (config: IBaseWorkerResolverBridgeConfig) {
        this.onNewConnection = config.newConnectionHandler;
        self.addEventListener('message', this.messageHandler);
    }

    public destroy(): void {
        self.removeEventListener('message', this.messageHandler);
    }

    private onMessage(event: MessageEvent): void {
        const action: IResolverBridgeConnectAction = event.data;
        if (action.type === ResolverBridgeAction.CONNECT) {
            const messageChannel = new MessageChannel();
            this.onNewConnection(messageChannel.port1);
            const connectedAction: IWorkerResolverBridgeConnectedAction = {
                id: action.id,
                type: WorkerResolverBridgeAction.CONNECTED,
                port: messageChannel.port2,
            }
            self.postMessage(connectedAction, [messageChannel.port2]);
        } else {
            throw new Error();
        }
    }
}
