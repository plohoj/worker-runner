import { WorkerRunnerUnexpectedError } from "../../../errors/worker-runner-error";
import { RunnerResolverPossibleConnection } from "../../../types/possible-connection";
import { IPromiseMethods } from "../../../utils/promise-list.resolver";
import { IHostResolverBridgeConnectedAction, HostResolverBridgeAction } from "../host/host-resolver-bridge.actions";
import { IClientResolverBridgeConnectAction, ClientResolverBridgeAction } from "./client-resolver-bridge.actions";

interface IClientBridgeConnectInfo extends Readonly<IPromiseMethods<MessagePort>>{
    readonly actionId: number,
    messagePort?: MessagePort,
}

export interface IClientResolverBridgeConfig {
    connection: RunnerResolverPossibleConnection;
}

export class ClientResolverBridge {
    private static readonly LAST_BRIDGE_ACTION_ID = '__workerRunner_lastActionId';

    protected readonly connection: RunnerResolverPossibleConnection;

    /** The bridge has a connection if the property exist */
    private connectInfo?: IClientBridgeConnectInfo;
    private readonly hostMessageHandler = this.onHostMessage.bind(this);

    constructor(config: IClientResolverBridgeConfig) {
        this.connection = config.connection;
    }

    public async connect(): Promise<MessagePort> {
        if (this.connectInfo) {
            throw new WorkerRunnerUnexpectedError({
                message: 'Connection already established',
            });
        }
        const messagePort = await new Promise<MessagePort>((resolve, reject) => {
            const actionId = this.resolveActionId();
            this.connectInfo = { actionId, resolve, reject };
            this.connection.addEventListener('message', this.hostMessageHandler as EventListener);
            const initAction: IClientResolverBridgeConnectAction = {
                id: actionId,
                type: ClientResolverBridgeAction.CONNECT,
            };
            this.connection.postMessage(initAction);
        });
        this.connection.removeEventListener('message', this.hostMessageHandler as EventListener);
        return messagePort;
    }

    private onHostMessage(event: MessageEvent): void {
        const action: IHostResolverBridgeConnectedAction = event.data;
        switch (action.type) {
            case HostResolverBridgeAction.CONNECTED:
                this.onConnected(action);
                break;
            default:
                throw new WorkerRunnerUnexpectedError({
                    message: 'Unexpected action type in Client Resolver Bridge from Host Resolver Bridge',
                });
        }
    }

    private onConnected(action: IHostResolverBridgeConnectedAction): void {
        if (!this.connectInfo) {
            throw new WorkerRunnerUnexpectedError({
                message: 'Connection was established before initiation',
            });
        }
        if (this.connectInfo.actionId === action.id) {
            this.connectInfo.resolve(action.port);
        }
    }

    private resolveActionId(): number {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let lastId = (this.connection as any)[ClientResolverBridge.LAST_BRIDGE_ACTION_ID];
        if (typeof lastId !== 'number') {
            lastId = 0;
        } else {
            lastId++;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.connection as any)[ClientResolverBridge.LAST_BRIDGE_ACTION_ID] = lastId;
        return lastId;
    }
}
