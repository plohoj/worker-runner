import { RunnerControllerAction } from '../actions/runner-controller.actions';
import { errorActionToRunnerError } from '../actions/runner-error';
import { NodeRunnerResolverBase } from '../resolver/node-runner.resolver';
import { Constructor, IRunnerConstructorParameter, RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { ResolveRunner } from './resolved-runner';
import { RunnerController } from './runner.controller';

export type IRunnerBridgeConstructor<T extends RunnerConstructor>
    = Constructor<ResolveRunner<InstanceType<T>>, ConstructorParameters<typeof RunnerBridge>>;

export const executeRunnerBridgeMethod = Symbol('Execute RunnerBridge method');
const lastRunnerBridgeActionId = Symbol('last RunnerBridge action id');
const executeViaNodeResolver =  Symbol('Execute via NodeResolver method');

export class RunnerBridge {

    private [lastRunnerBridgeActionId] = 0;
    private [executeViaNodeResolver]: typeof RunnerController.prototype.execute;

    constructor(
        executeMethod: typeof RunnerController.prototype.execute,
    ) {
        this[executeViaNodeResolver] = executeMethod;
    }

    public static isRunnerBridge(instance: any): instance is RunnerBridge {
        return typeof instance[lastRunnerBridgeActionId] === 'number';
    }

    protected async [executeRunnerBridgeMethod](methodName: string, args: IRunnerConstructorParameter[],
        ): Promise<JsonObject | undefined> {
        try {
            return await this[executeViaNodeResolver]({
                type:  RunnerControllerAction.EXECUTE,
                id: this[lastRunnerBridgeActionId]++,
                method: methodName,
                args: NodeRunnerResolverBase.serializeArguments(args),
            });
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }

    /** Remove runner instance from Worker Runners list */
    public async destroy(): Promise<void> {
        try {
            await this[executeViaNodeResolver]({
                type: RunnerControllerAction.DESTROY,
                id: this[lastRunnerBridgeActionId]++,
            });
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }
}
