import { NodeAction } from '../actions/node.actions';
import { errorActionToRunnerError } from '../actions/runner-error';
import { IWorkerRunnerExecutedAction } from '../actions/worker.actions';
import { NodeRunnerResolverBase } from '../resolver/node-runner.resolver';
import { Constructor, RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { ResolveRunner } from './resolved-runner';

export type IRunnerBridgeConstructor<T extends RunnerConstructor>
    = Constructor<ResolveRunner<InstanceType<T>>, ConstructorParameters<typeof RunnerBridge>>;

export const executeRunnerBridgeMethod = Symbol('Execute RunnerBridge method');
const lastRunnerBridgeActionId = Symbol('last RunnerBridge action id');
const executeViaNodeResolver =  Symbol('Execute via NodeResolver method');
const runnerBridgeInstanceId =  Symbol('RunnerBridge instanceId');

export class RunnerBridge {
    private [lastRunnerBridgeActionId] = 0;
    private [executeViaNodeResolver]: typeof NodeRunnerResolverBase.prototype.execute;
    private [runnerBridgeInstanceId]: number;

    constructor(
        executeMethod: typeof NodeRunnerResolverBase.prototype.execute,
        instanceId: number,
    ) {
        this[executeViaNodeResolver] = executeMethod;
        this[runnerBridgeInstanceId] = instanceId;
    }

    protected async [executeRunnerBridgeMethod](methodName: string, args: JsonObject[],
        ): Promise<JsonObject | undefined> {
        let workerAction: IWorkerRunnerExecutedAction;
        try {
            workerAction = await this[executeViaNodeResolver]({
                type: NodeAction.EXECUTE,
                actionId: this[lastRunnerBridgeActionId]++,
                instanceId: this[runnerBridgeInstanceId],
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
            await this[executeViaNodeResolver]({
                type: NodeAction.DESTROY,
                instanceId: this[runnerBridgeInstanceId],
            });
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }
}
