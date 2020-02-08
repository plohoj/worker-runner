import { RunnerControllerAction } from '../actions/runner-controller.actions';
import { errorActionToRunnerError } from '../actions/runner-error';
import { NodeRunnerResolverBase } from '../resolver/node-runner.resolver';
import { Constructor, IRunnerParameter, RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { ResolveRunner } from './resolved-runner';
import { RunnerController } from './runner.controller';

export type IRunnerBridgeConstructor<T extends RunnerConstructor>
    = Constructor<ResolveRunner<InstanceType<T>>, ConstructorParameters<typeof RunnerBridge>>;

export const executeRunnerBridgeMethod = Symbol('Execute RunnerBridge method');
const lastRunnerBridgeActionId = Symbol('last RunnerBridge action id');
export const runnerBridgeController =  Symbol('Execute via NodeResolver method');

export class RunnerBridge {

    private [lastRunnerBridgeActionId] = 0;
    private [runnerBridgeController]: RunnerController<RunnerConstructor>;

    constructor(
        controller: RunnerController<RunnerConstructor>,
    ) {
        this[runnerBridgeController] = controller;
    }

    public static isRunnerBridge(instance: any): instance is RunnerBridge {
        return typeof instance[lastRunnerBridgeActionId] === 'number';
    }

    protected async [executeRunnerBridgeMethod](
        methodName: string,
        args: IRunnerParameter[],
    ): Promise<JsonObject> {
        try {
            const serializedArgs = await NodeRunnerResolverBase.serializeArguments(args);
            return this[runnerBridgeController].execute(
                {
                    type:  RunnerControllerAction.EXECUTE,
                    id: this[lastRunnerBridgeActionId]++,
                    method: methodName,
                    args: serializedArgs.args,
                },
                serializedArgs.transfer,
            );
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }

    /** Remove runner instance from Worker Runners list */
    public async destroy(): Promise<void> {
        try {
            await this[runnerBridgeController].execute({
                type: RunnerControllerAction.DESTROY,
                id: this[lastRunnerBridgeActionId]++,
            });
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }
}
