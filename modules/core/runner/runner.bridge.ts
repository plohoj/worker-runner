import { Constructor, IRunnerParameter, IRunnerSerializedMethodResult, RunnerConstructor } from '../types/constructor';
import { RunnerController } from './controller/runner.controller';
import { ResolvedRunner } from './resolved-runner';

export type IRunnerBridgeConstructor<T extends RunnerConstructor = RunnerConstructor>
    = Constructor<ResolvedRunner<InstanceType<T>>, ConstructorParameters<typeof RunnerBridge>>;

export const EXECUTE_RUNNER_CONTROLLER_METHOD = '__workerRunner_executeControllerMethod';
export const RUNNER_BRIDGE_CONTROLLER = '__workerRunner_bridgeController';

export class RunnerBridge {

    private [RUNNER_BRIDGE_CONTROLLER]: RunnerController<RunnerConstructor>;

    constructor(
        controller: RunnerController<RunnerConstructor>,
    ) {
        this[RUNNER_BRIDGE_CONTROLLER] = controller;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    public static isRunnerBridge(instance: any): instance is RunnerBridge {
        return !!instance && !!instance[RUNNER_BRIDGE_CONTROLLER];
    }

    /** Unsubscribe from runner, if the control object was the last, then runner will be automatically destroyed */
    public async disconnect(): Promise<void> {
        await this[RUNNER_BRIDGE_CONTROLLER].disconnect();
    }

    /** Destroying and remove Runner instance from resolved Runners list in `RunnerResolver` instance */
    public async destroy(): Promise<void> {
        await this[RUNNER_BRIDGE_CONTROLLER].destroy();
    }

    /** Returns a new control object for the same Runner instance */
    public async cloneControl(): Promise<this> {
        const runnerController = await this[RUNNER_BRIDGE_CONTROLLER].cloneControl();
        return runnerController.resolvedRunner as this;
    }
    /**
     * When a Runner is flagged for transfer, if it is used as argument or as method result,
     * the original control will be transferred. The original Resolved Runner will lose control.
     * In this case, the transfer of the Resolved Runner will be faster
     * because it will not take time to request a copy of the control.
     * It is convenient to use as an automatic disconnect after returning the result of a method.
     */
    public markForTransfer(): this {
        this[RUNNER_BRIDGE_CONTROLLER].markForTransfer();
        return this;
    }
    
    protected async [EXECUTE_RUNNER_CONTROLLER_METHOD](
        methodName: string,
        args: IRunnerParameter[],
    ): Promise<IRunnerSerializedMethodResult> {
        return this[RUNNER_BRIDGE_CONTROLLER].execute(methodName, args);
    }
}
