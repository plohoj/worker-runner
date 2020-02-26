import { IRunnerParameter, NodeAndLocalRunnerResolverBase, ResolveRunnerArguments, RunnerConstructor } from '@worker-runner/core';
import { RxResolveRunner } from '../resolved-runner';
import { RxRunnerController } from '../runners/runner.controller';

export class RxNodeRunnerResolver<R extends RunnerConstructor> extends NodeAndLocalRunnerResolverBase<R> {

    declare public resolve: <RR extends R>(
        runner: RR,
        ...args: RR extends new (...args: infer A) => any ?
            A extends Array<IRunnerParameter> ? ResolveRunnerArguments<A> : never : never
    ) => Promise<RxResolveRunner<InstanceType<RR>>>;

    declare protected runnerControllers: Set<RxRunnerController<R>>;
    protected RunnerControllerConstructor = RxRunnerController;
}
