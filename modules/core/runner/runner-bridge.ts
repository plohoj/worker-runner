import { errorActionToRunnerError } from '../actions/runner-error';
import { Constructor, IRunnerParameter, RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { ResolveRunner } from './resolved-runner';
import { RunnerController } from './runner.controller';

export type IRunnerBridgeConstructor<T extends RunnerConstructor>
    = Constructor<ResolveRunner<InstanceType<T>>, ConstructorParameters<typeof RunnerBridge>>;

export const executeRunnerBridgeMethod = Symbol('Execute RunnerBridge method');
export const runnerBridgeController =  Symbol('Execute via NodeResolver method');

export class RunnerBridge {

    private [runnerBridgeController]: RunnerController<RunnerConstructor>;

    constructor(
        controller: RunnerController<RunnerConstructor>,
    ) {
        this[runnerBridgeController] = controller;
    }

    public static isRunnerBridge(instance: any): instance is RunnerBridge {
        return !!instance[runnerBridgeController];
    }

    protected async [executeRunnerBridgeMethod](
        methodName: string,
        args: IRunnerParameter[],
    ): Promise<JsonObject | void> {
        try {
            return this[runnerBridgeController].execute(methodName, args);
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }

    /** Unsubscribe from runner, if the subscription was the last, then runner will be automatically destroyed */
    public async disconnect(): Promise<void> {
        try {
            await this[runnerBridgeController].disconnect();
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }

    /** Remove runner instance from Worker Runners list */
    public async destroy(): Promise<void> {
        try {
            await this[runnerBridgeController].destroy();
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }
}
