import { WorkerRunnerUnexpectedError } from "../../errors/worker-runner-error";
import { RunnerResolverPossibleConnection } from "../../types/possible-connection";
import { actionLog } from '../../utils/action-log';
import { IPromiseMethods } from "../../utils/promise-list.resolver";
import { IRunnerResolverBridgeHostConnectedAction, RunnerResolverBridgeHostAction, IRunnerResolverBridgeHostAction } from "../host/runner-resolver-bridge.client.actions";
import { IRunnerResolverBridgeClientConnectAction, RunnerResolverBridgeClientAction, IRunnerResolverBridgeClientPingAction } from "./runner-resolver-bridge.client.actions";

interface IRunnerResolverBridgeClientConnectInfo extends Readonly<IPromiseMethods<MessagePort>>{
    actionId?: number,
    messagePort?: MessagePort,
}

export interface IRunnerResolverBridgeClientConfig {
    connection: RunnerResolverPossibleConnection;
}

export class RunnerResolverBridgeClient {
    private static readonly LAST_BRIDGE_ACTION_ID = '__workerRunner_lastActionId';

    protected readonly connection: RunnerResolverPossibleConnection;

    /** The bridge has a connection if the property exist */
    private connectInfo?: IRunnerResolverBridgeClientConnectInfo;
    private readonly hostMessageHandler = this.onHostMessage.bind(this);

    constructor(config: IRunnerResolverBridgeClientConfig) {
        this.connection = config.connection;
    }

    public async connect(): Promise<MessagePort> {
        if (this.connectInfo) {
            throw new WorkerRunnerUnexpectedError({ message: 'Connection already established' });
        }
        const messagePort = await new Promise<MessagePort>((resolve, reject) => {
            this.connectInfo = { resolve, reject };
            this.connection.addEventListener('message', this.hostMessageHandler as EventListener);
            const pingAction: IRunnerResolverBridgeClientPingAction = { type: RunnerResolverBridgeClientAction.PING };
            actionLog('client-out', pingAction);
            this.connection.postMessage(pingAction);
        });
        this.connection.removeEventListener('message', this.hostMessageHandler as EventListener);
        return messagePort;
    }

    private onHostMessage(event: MessageEvent): void {
        const action: IRunnerResolverBridgeHostAction = event.data;
        actionLog('client-in', action);
        switch (action.type) {
            case RunnerResolverBridgeHostAction.PING:
            case RunnerResolverBridgeHostAction.PONG:
                this.onPingOrPongAction();
                break;
            case RunnerResolverBridgeHostAction.CONNECTED:
                this.onConnected(action);
                break;
            default:
                throw new WorkerRunnerUnexpectedError({
                    message: 'Unexpected action type in RunnerResolverBridgeClient from RunnerResolverBridgeHost',
                });
        }
    }
    
    private onPingOrPongAction(): void {
        if (!this.connectInfo) {
            throw new WorkerRunnerUnexpectedError({ message: 'Connection was established before initiation' });
        }
        if (typeof this.connectInfo.actionId === 'number') {
            // The connection is already established or has been established
            return;
        }
        const actionId = this.resolveActionId();
        this.connectInfo.actionId = actionId;
        const connectAction: IRunnerResolverBridgeClientConnectAction = {
            id: actionId,
            type: RunnerResolverBridgeClientAction.CONNECT,
        };
        actionLog('client-out', connectAction);
        this.connection.postMessage(connectAction);
    }

    private onConnected(action: IRunnerResolverBridgeHostConnectedAction): void {
        if (!this.connectInfo) {
            throw new WorkerRunnerUnexpectedError({ message: 'Connection was established before initiation' });
        }
        if (this.connectInfo.actionId === action.id) {
            this.connectInfo.resolve(action.port);
        }
    }

    private resolveActionId(): number {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let lastId = (this.connection as any)[RunnerResolverBridgeClient.LAST_BRIDGE_ACTION_ID];
        if (typeof lastId !== 'number') {
            lastId = 0;
        } else {
            lastId++;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.connection as any)[RunnerResolverBridgeClient.LAST_BRIDGE_ACTION_ID] = lastId;
        return lastId;
    }
}
