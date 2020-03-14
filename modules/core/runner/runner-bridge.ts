import { errorActionToRunnerError } from '../actions/runner-error';
import { Constructor, IRunnerParameter, IRunnerSerializedMethodResult, RunnerConstructor } from '../types/constructor';
import { ResolvedRunner } from './resolved-runner';
import { RunnerController } from './runner.controller';

export type IRunnerBridgeConstructor<T extends RunnerConstructor>
    = Constructor<ResolvedRunner<InstanceType<T>>, ConstructorParameters<typeof RunnerBridge>>;

export const executeRunnerBridgeMethod = Symbol('Execute RunnerBridge method');
export const runnerBridgeController = Symbol('Execute via NodeResolver method');

export class RunnerBridge {

    private [runnerBridgeController]: RunnerController<RunnerConstructor>;

    constructor(
        controller: RunnerController<RunnerConstructor>,
    ) {
        this[runnerBridgeController] = controller;
    }

    public static isRunnerBridge(instance: any): instance is RunnerBridge {
        return !!instance && !!instance[runnerBridgeController];
    }

    protected async [executeRunnerBridgeMethod](
        methodName: string,
        args: IRunnerParameter[],
    ): Promise<IRunnerSerializedMethodResult> {
        try {
            return this[runnerBridgeController].execute(methodName, args);
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }

    /** Unsubscribe from runner, if the control object was the last, then runner will be automatically destroyed */
    public async disconnect(): Promise<void> {
        try {
            await this[runnerBridgeController].disconnect();
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }

    /** Destroying and remove Runner instance from resolved Runners list in `RunnerResolver` instance */
    public async destroy(): Promise<void> {
        try {
            await this[runnerBridgeController].destroy();
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }

    /** Returns a new control object for the same Runner instance */
    public async cloneControl(): Promise<this> {
        try {
            const runnerController = await this[runnerBridgeController].cloneControl();
            return runnerController.resolvedRunner as this;
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }
    /**
     * When a Runner is flagged for transfer, if it is used as argument or as method result,
     * the original control will be transferred. The original Resolved Runner will lose control.
     * In this case, the transfer of the Resolved Runner will be faster
     * because it will not take time to request a copy of the control.
     * It is convenient to use as an automatic disconnect after returning the result of a method.
     */
    public markForTransfer(): this {
        this[runnerBridgeController].markForTransfer();
        return this;
    }
}
