import { WorkerRunnerUnexpectedError } from "../../../errors/worker-runner-error";
import { RunnerResolverPossibleConnection } from "../../../types/possible-connection";
import { IPromiseMethods } from "../../../utils/promise-list.resolver";
import { IWorkerResolverBridgeConnectedAction, WorkerResolverBridgeAction } from "../worker/worker-resolver-bridge.actions";
import { IResolverBridgeConnectAction, ResolverBridgeAction } from "./resolver-bridge.actions";

interface IBridgeConnectInfo extends Readonly<IPromiseMethods<MessagePort>>{
    readonly actionId: number,
    messagePort?: MessagePort,
}

export interface IResolverBridgeConfig {
    connection: RunnerResolverPossibleConnection;
}

export class ResolverBridge {
    private static readonly LAST_WORKER_ACTION_ID = '__workerRunner_lastActionId';

    protected readonly connection: RunnerResolverPossibleConnection;

    /** The bridge has a connection if the property exist */
    private connectInfo?: IBridgeConnectInfo;
    private readonly workerMessageHandler = this.onWorkerMessage.bind(this);

    constructor(config: IResolverBridgeConfig) {
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
            this.connection.addEventListener('message', this.workerMessageHandler as EventListener);
            const initAction: IResolverBridgeConnectAction = {
                id: actionId,
                type: ResolverBridgeAction.CONNECT,
            };
            this.connection.postMessage(initAction);
        });
        this.connection.removeEventListener('message', this.workerMessageHandler as EventListener);
        return messagePort;
    }

    private onWorkerMessage(event: MessageEvent): void {
        const action: IWorkerResolverBridgeConnectedAction = event.data;
        switch (action.type) {
            case WorkerResolverBridgeAction.CONNECTED:
                this.onConnected(action);
                break;
            default:
                throw new WorkerRunnerUnexpectedError({
                    message: 'Unexpected action type in Node resolver Bridge from Worker resolver Bridge',
                });
        }
    }

    private onConnected(action: IWorkerResolverBridgeConnectedAction): void {
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
        let lastId = (this.connection as any)[ResolverBridge.LAST_WORKER_ACTION_ID];
        if (typeof lastId !== 'number') {
            lastId = 0;
        } else {
            lastId++;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.connection as any)[ResolverBridge.LAST_WORKER_ACTION_ID] = lastId;
        return lastId;
    }
}
