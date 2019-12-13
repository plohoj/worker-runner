import { Constructor, RunnerConstructor } from '@core/types/constructor';
import { JsonObject } from '@core/types/json-object';
import { NodeAction } from '../actions/node-actions';
import { errorActionToRunnerError } from '../actions/runner-error';
import { IWorkerRunnerExecutedAction } from '../actions/worker-actions';
import { WorkerBridgeBase } from '../worker-bridge/worker-bridge-base';
import { ResolveRunner } from './resolved-runner';

export type IRunnerBridgeConstructor<T extends RunnerConstructor>
    = Constructor<ResolveRunner<InstanceType<T>>, ConstructorParameters<typeof RunnerBridge>>;

export class RunnerBridge {
    private _lastActionId = 0;

    constructor(
        private _workerBridge: WorkerBridgeBase,
        private _instanceId: number,
    ) {}

    protected async _executeMethod(methodName: string, args: JsonObject[]): Promise<JsonObject | undefined> {
        let workerAction: IWorkerRunnerExecutedAction;
        try {
            workerAction = await this._workerBridge.execute({
                type: NodeAction.EXECUTE,
                actionId: this._lastActionId++,
                instanceId: this._instanceId,
                method: methodName,
                arguments: args,
            });
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
        return workerAction.response;
    }

    /** Remove runner instance from Worker Runners list */
    public async destroy(): Promise<void> {
        try {
            await this._workerBridge.execute({
                type: NodeAction.DESTROY,
                instanceId: this._instanceId,
            });
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }
}
