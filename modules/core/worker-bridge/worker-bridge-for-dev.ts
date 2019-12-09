import { INodeCommand } from "../commands/node-commands";
import { WorkerBridgeBase } from "./worker-bridge-base";

export class WorkerBridgeForDev extends WorkerBridgeBase {
    // constructor(private runnerResolver: InstanceType<ReturnType<typeof workerRunnerResolverMixin>>) {
    //     super();
    //     runnerResolver.sendCommand = this.handleWorkerCommand.bind(this);
    // }

    protected sendCommand(command: INodeCommand): void {
        // this.runnerResolver.handleCommand(command);
    }
}