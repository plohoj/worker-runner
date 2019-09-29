import { INodeCommand } from "../commands/node-commands";
import { WorkerBridgeBase } from "./worker-bridge-base";

export class WorkerBridge extends WorkerBridgeBase {
    private workerMessageHandler = this.onWorkerMessage.bind(this);

    constructor(private worker: Worker) {
        super();
        this.worker.addEventListener('message', this.workerMessageHandler);
    }

    public destroy(): void {
        this.worker.removeEventListener('message', this.workerMessageHandler);
    }

    protected sendCommand(command: INodeCommand): void {
        this.worker.postMessage(command);
    }
}
