import { Constructor, RunnerConstructor } from "@core/types/constructor";
import { JsonObject } from "@core/types/json-object";
import { NodeCommand } from "../commands/node-commands";
import { errorCommandToRunnerError } from "../commands/runner-error";
import { IWorkerCommandRunnerResponse } from "../commands/worker-commands";
import { WorkerBridgeBase } from "../worker-bridge/worker-bridge-base";
import { ResolveRunner } from "./resolved-runner";

export type IRunnerBridgeConstructor<T extends RunnerConstructor>
    = Constructor<ResolveRunner<InstanceType<T>>, ConstructorParameters<typeof RunnerBridge>>;

export class RunnerBridge {
    private _lastCommandId = 0;

    constructor(
        private _workerBridge: WorkerBridgeBase,
        private _instanceId:number,
    ) {}

    protected async _executeMethod(methodName: string, args: JsonObject[]): Promise<JsonObject | undefined> {
        let workerCommand: IWorkerCommandRunnerResponse;
        try {
            workerCommand = await this._workerBridge.execCommand({
                type: NodeCommand.EXECUTE,
                commandId: this._lastCommandId++,
                instanceId: this._instanceId,
                method: methodName,
                arguments: args,
            });
        } catch (error) {
            throw errorCommandToRunnerError(error);
        }
        return workerCommand.response;
    }

    /** Remove runner instance from Worker Runners list */
    public async destroy(): Promise<void> {
        try {
            await this._workerBridge.execCommand({
                type: NodeCommand.DESTROY,
                instanceId: this._instanceId,
            });
        } catch (error) {
            throw errorCommandToRunnerError(error);
        }
    }
}