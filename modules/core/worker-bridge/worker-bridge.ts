import { INodeAction } from '../actions/node.actions';
import { IWorkerDestroyedAction, WorkerAction } from '../actions/worker.actions';
import { extractError } from '../errors/extract-error';
import { RunnerErrorMessages } from '../errors/runners-errors';
import { WorkerBridgeBase } from './worker-bridge-base';

interface IWorkerBridgeConfig {
    workerPath: string;
    workerName: string;
}

export class WorkerBridge extends WorkerBridgeBase {
    private worker?: Worker;
    private workerMessageHandler = this.onWorkerMessage.bind(this);

    constructor(private config: IWorkerBridgeConfig) {
        super();
    }

    public async init(): Promise<void> {
        const worker = new Worker(this.config.workerPath, { name: this.config.workerName });
        await new Promise(resolve => {
            worker.onmessage = (message) => {
                if (message.data && message.data.type === WorkerAction.WORKER_INIT) {
                    resolve();
                }
            };
        });
        this.worker = worker;
        this.worker.addEventListener('message', this.workerMessageHandler);
    }

    public async destroy(force = false): Promise<IWorkerDestroyedAction> {
        if (this.worker) {
            const destroyResult: IWorkerDestroyedAction = await super.destroy(force);
            this.worker.terminate();
            this.worker = undefined;
            return destroyResult;
        } else {
            throw extractError(new Error(RunnerErrorMessages.WORKER_BRIDGE_NOT_INIT));
        }
    }

    protected sendAction(action: INodeAction): void {
        if (this.worker) {
            this.worker.postMessage(action);
        } else {
            const error = new Error(RunnerErrorMessages.WORKER_BRIDGE_NOT_INIT);
            this.handleWorkerAction({
                type: WorkerAction.WORKER_ERROR,
                error,
                message: RunnerErrorMessages.WORKER_BRIDGE_NOT_INIT,
                stacktrace: error.stack,
            });
        }
    }
}
