import { WorkerBridge } from "../bridge/worker-bridge";
import { NodeCommand } from "../commands/node-commands";

export class RunnerInstance {
    private _lastCommandId = 0;

    constructor(
        private _workerBridge: WorkerBridge,
        private _runnerId:number,
    ) {}

    protected _executeMethod(methodName: string, args: any[]) {
        return this._workerBridge.execCommand({
            type: NodeCommand.RUN,
            id: this._lastCommandId++,
            runnerId: this._runnerId,
            method: methodName,
            arguments: args,
        }).then(command => command.response);
    }
}