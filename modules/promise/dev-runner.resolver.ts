import { Constructor } from "@core/constructor";
import { DevWorkerBridge } from "@core/worker-bridge/dev-worker-bridge";
import { NodeRunnerResolver } from "./node-runner.resolver";
import { WorkerRunnerResolver } from "./worker-runner.resolver";

export class DevRunnerResolver<R extends Constructor> extends NodeRunnerResolver<R> {

    protected async buildWorkerBridge(): Promise<void> {
        this.workerBridges = [new DevWorkerBridge(new WorkerRunnerResolver(this.config))];
    }
}
