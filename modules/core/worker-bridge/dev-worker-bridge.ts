import { WorkerRunnerResolverBase } from "@core/resolver/worker-runner.resolver";
import { INodeCommand } from "../commands/node-commands";
import { WorkerBridgeBase } from "./worker-bridge-base";

export class DevWorkerBridge extends WorkerBridgeBase {
    constructor(private workerRunnerResolver: WorkerRunnerResolverBase<any>) {
        super();
        workerRunnerResolver.sendCommand = this.handleWorkerCommand.bind(this);
    }

    protected sendCommand(command: INodeCommand): void {
        this.workerRunnerResolver.handleCommand(command);
    }
}