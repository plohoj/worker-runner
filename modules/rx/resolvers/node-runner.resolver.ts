import { NodeAndLocalRunnerResolverBase, ResolvedRunnerArguments, RunnerConstructor } from '@worker-runner/core';
import { IRxRunnerSerializedParameter, RxResolvedRunner } from '../resolved-runner';
import { RxRunnerController } from '../runners/runner.controller';

export class RxNodeRunnerResolver<R extends RunnerConstructor> extends NodeAndLocalRunnerResolverBase<R> {

    declare public resolve: <RR extends R>(
        runner: RR,
        ...args: RR extends new (...args: infer A) => any ?
            A extends Array<IRxRunnerSerializedParameter> ? ResolvedRunnerArguments<A> : never : never
    ) => Promise<RxResolvedRunner<InstanceType<RR>>>;

    declare protected runnerControllers: Set<RxRunnerController<R>>;
    protected RunnerControllerConstructor = RxRunnerController;
}
