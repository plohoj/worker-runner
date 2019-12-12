import { Constructor } from "@core/constructor";
import { WorkerBridgeBase } from "@core/worker-bridge/worker-bridge-base";
import { NodeRunnerResolver } from "../node-runner.resolver";
import { DevWorkerRunnerResolver } from "./worker-runner.resolver";

export class DevRunnerResolver<R extends Constructor> extends NodeRunnerResolver<R> {

    protected async buildWorkerBridge(): Promise<WorkerBridgeBase[]> {
        const workerResolve = new  DevWorkerRunnerResolver(this.config);
        return [workerResolve.workerBridge];
    }
}
