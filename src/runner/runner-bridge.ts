import { NodeCommand } from "../commands/node-commands";
import { Constructor } from "../constructor";
import { WorkerBridge } from "../worker-bridge";
import { ResolveRunner } from "./resolved-runner";

export type IRunnerBridge<T extends Constructor> = Constructor<ResolveRunner<InstanceType<T>>>;

export class RunnerBridge {
    private _lastCommandId = 0;

    constructor(
        private _workerBridge: WorkerBridge,
        private _instanceId:number,
    ) {}

    protected async _executeMethod(methodName: string, args: any[]): Promise<any> {
        const workerCommand = await this._workerBridge.execCommand({
            type: NodeCommand.RUN,
            commandId: this._lastCommandId++,
            instanceId: this._instanceId,
            method: methodName,
            arguments: args,
        })
        return workerCommand.response;
    }
}