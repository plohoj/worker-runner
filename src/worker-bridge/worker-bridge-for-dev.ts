import { INodeCommand } from "../commands/node-commands";
import { workerRunnerResolverMixin } from "../resolver/worker-runner.resolver";
import { WorkerBridgeBase } from "./worker-bridge-base";

export class WorkerBridgeForDev extends WorkerBridgeBase {
    constructor(private runnerResolver: InstanceType<ReturnType<typeof workerRunnerResolverMixin>>) {
        super();
        runnerResolver.sendCommand = this.handleWorkerCommand.bind(this);
    }

    public destroy(): void {}

    protected sendCommand(command: INodeCommand): void {
        debugger;
        this.runnerResolver.handleCommand(command);
    }
}