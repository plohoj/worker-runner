import { RunnerEnvironmentClient } from '../runner-environment/client/runner-environment.client';
import { Constructor, RunnerConstructor } from '../types/constructor';
import { ResolvedRunner } from './resolved-runner';

export type IRunnerControllerConstructor<T extends RunnerConstructor = RunnerConstructor>
    = Constructor<ResolvedRunner<InstanceType<T>>, ConstructorParameters<typeof RunnerController>>;

export const RUNNER_ENVIRONMENT_CLIENT = '__workerRunner_runnerEnvironmentClient';

export class RunnerController {

    private [RUNNER_ENVIRONMENT_CLIENT]: RunnerEnvironmentClient;

    constructor(
        controller: RunnerEnvironmentClient,
    ) {
        this[RUNNER_ENVIRONMENT_CLIENT] = controller;
    }

    public static isRunnerController(instance: unknown): instance is RunnerController {
        return !!(instance as RunnerController | undefined)?.[RUNNER_ENVIRONMENT_CLIENT];
    }

    /** Unsubscribe from runner, if the control object was the last, then runner will be automatically destroyed */
    public async disconnect(): Promise<void> {
        await this[RUNNER_ENVIRONMENT_CLIENT].disconnect();
    }

    /** Destroying and remove Runner instance from resolved Runners list in `RunnerResolver` instance */
    public async destroy(): Promise<void> {
        await this[RUNNER_ENVIRONMENT_CLIENT].destroy();
    }

    /**
     * When a Runner is flagged for transfer, if it is used as argument or as method result,
     * the original control will be transferred. The original Resolved Runner will lose control.
     * In this case, the transfer of the Resolved Runner will be faster
     * because it will not take time to request a copy of the control.
     * It is convenient to use as an automatic disconnect after returning the result of a method.
     */
    public markForTransfer(): this {
        this[RUNNER_ENVIRONMENT_CLIENT].markForTransfer();
        return this;
    }
}
