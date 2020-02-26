import { Constructor, IRunnerParameter, NodeAndLocalRunnerResolverBase, ResolveRunnerArguments, RunnerBridge, RunnerConstructor } from '@worker-runner/core';
import { RxResolveRunner } from '../resolved-runner';
import { RxRunnerController } from '../runners/runner.controller';

export type IRxRunnerBridgeConstructor<T extends RunnerConstructor>
    = Constructor<RxResolveRunner<InstanceType<T>>, ConstructorParameters<typeof RunnerBridge>>;

export class RxNodeRunnerResolver<R extends RunnerConstructor> extends NodeAndLocalRunnerResolverBase<R> {

    declare protected runnerControllers: Set<RxRunnerController<R>>;
    protected RunnerControllerConstructor = RxRunnerController;

    public async resolve<RR extends R>(
        runner: RR,
        ...args: RR extends new (...args: infer A) => any ?
            A extends Array<IRunnerParameter> ? ResolveRunnerArguments<A> : never : never
    ): Promise<RxResolveRunner<InstanceType<RR>>> {
        const runnerId = this.config.runners.indexOf(runner);
        const action = await this.sendInitAction(runnerId, args);
        return this.buildRunnerController(action, runnerId).resolvedRunner as any;
    }
}
