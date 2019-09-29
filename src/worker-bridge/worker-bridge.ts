import { INodeCommand } from "../commands/node-commands";
import { IWorkerCommandWorkerDestroyed, WorkerCommand } from "../commands/worker-commands";
import { extractError } from "../errors/extract-error";
import { RunnerErrorMessages } from "../errors/runners-errors";
import { WorkerBridgeBase } from "./worker-bridge-base";

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
                if (message.data && message.data.type === WorkerCommand.WORKER_INIT) {
                    resolve();
                }
            };
        });
        this.worker = worker;
        this.worker.addEventListener('message', this.workerMessageHandler);
    }

    public async destroy(force = false): Promise<IWorkerCommandWorkerDestroyed> {
        if (this.worker) {
            const destroyResult: IWorkerCommandWorkerDestroyed = await super.destroy(force);
            this.worker.terminate();
            this.worker = undefined;
            return destroyResult;
        } else {
            throw extractError(new Error(RunnerErrorMessages.WORKER_BRIDGE_NOT_INIT));
        }
    }

    protected sendCommand(command: INodeCommand): void {
        if (this.worker) {
            this.worker.postMessage(command);
        } else {
            const error = new Error(RunnerErrorMessages.WORKER_BRIDGE_NOT_INIT)
            this.handleWorkerCommand({
                type: WorkerCommand.WORKER_ERROR,
                error,
                message: RunnerErrorMessages.WORKER_BRIDGE_NOT_INIT,
                stacktrace: error.stack,
            })
        }
    }
}
