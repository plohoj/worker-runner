import { IWorkerCommand } from "@core/commands/worker-commands";
import { WorkerRunnerResolverBase } from "@core/resolver/worker-runner.resolver";
import { Constructor } from "@core/types/constructor";
import { DevWorkerBridge } from "@core/worker-bridge/dev-worker-bridge";

export class DevWorkerRunnerResolver<R extends Constructor<{[key: string]: any}>> extends WorkerRunnerResolverBase<R> {
    public workerBridge = new DevWorkerBridge(this);

    public sendCommand(command: IWorkerCommand): void {
        this.workerBridge.handleWorkerCommand(command);
    }
}
