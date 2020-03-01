import { NodeAndLocalRunnerResolverBase, ResolveRunnerArguments, RunnerConstructor } from '@worker-runner/core';
import { IRxRunnerSerializedParameter, RxResolveRunner } from '../resolved-runner';
import { RxRunnerController } from '../runners/runner.controller';

export class RxNodeRunnerResolver<R extends RunnerConstructor> extends NodeAndLocalRunnerResolverBase<R> {

    declare public resolve: <RR extends R>(
        runner: RR,
        ...args: RR extends new (...args: infer A) => any ?
            A extends Array<IRxRunnerSerializedParameter> ? ResolveRunnerArguments<A> : never : never
    ) => Promise<RxResolveRunner<InstanceType<RR>>>;

    declare protected runnerControllers: Set<RxRunnerController<R>>;
    protected RunnerControllerConstructor = RxRunnerController;
}
