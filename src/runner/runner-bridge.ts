import { NodeCommand } from "../commands/node-commands";
import { Constructor } from "../constructor";
import { WorkerBridge } from "../worker-bridge";
import { ResolveRunner } from "./resolved-runner";

export type IRunnerBridge<T extends Constructor> = Constructor<ResolveRunner<InstanceType<T>>>;

export class RunnerBridge {
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