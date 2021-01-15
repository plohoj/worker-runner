import { WorkerRunnerUnexpectedError } from "../../../errors/worker-runner-error";
import { IWorkerRunnerPossibleConnectionConfig, WorkerRunnerPossibleConnection } from "../../../types/possible-connection";
import { IPromiseMethods } from "../../../utils/promise-list.resolver";
import { IWorkerResolverBridgeConnectedAction, WorkerResolverBridgeAction } from "../worker/worker-resolver-bridge.actions";
import { IBaseResolverBridge } from './base-resolver.bridge'
import { IResolverBridgeConnectAction, ResolverBridgeAction } from "./resolver-bridge.actions";

interface IBridgeConnectInfo extends Readonly<IPromiseMethods<MessagePort>>{
    readonly actionId: number,
    messagePort?: MessagePort,
}

export class ResolverBridge implements IBaseResolverBridge {
    private static readonly LAST_WORKER_ACTION_ID = '__workerRunner_lastActionId';
    
    public messagePort?: MessagePort;

    /** The bridge has a connection if the property exist */
    private connectInfo?: IBridgeConnectInfo;
    private readonly connection: Exclude<WorkerRunnerPossibleConnection, SharedWorker>;
    private readonly workerMessageHandler = this.onWorkerMessage.bind(this);

    constructor(config: IWorkerRunnerPossibleConnectionConfig) {
        if (config.connection instanceof SharedWorker) {
            this.connection = config.connection.port;
        } else {
            this.connection = config.connection;
        }
    }

    public async connect(): Promise<MessagePort> {
        if (this.connectInfo) {
            throw new WorkerRunnerUnexpectedError({
                message: 'Connection already established',
            });
        }
        return new Promise((resolve, reject) => {
            const actionId = this.resolveActionId();
            this.connectInfo = { actionId, resolve, reject };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.connection.addEventListener('message', this.workerMessageHandler as any);
            const initAction: IResolverBridgeConnectAction = {
                id: actionId,
                type: ResolverBridgeAction.CONNECT,
            };
            this.connection.postMessage(initAction);
        });
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
