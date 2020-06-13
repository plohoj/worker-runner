import { NodeAndLocalRunnerResolverBase, ResolvedRunnerArguments, RunnerConstructor } from '@worker-runner/core';
import { RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RxRunnerController } from '../runners/runner.controller';
import { IRxRunnerSerializedParameter, RxResolvedRunner, RxResolvedRunnerArguments } from '../types/resolved-runner';

export class RxNodeRunnerResolver<R extends RunnerConstructor> extends NodeAndLocalRunnerResolverBase<R> {

    declare public resolve: <RR extends R>(
        runner: RR,
        ...args: RR extends new (...args: infer A) => any ?
            A extends Array<IRxRunnerSerializedParameter> ? RxResolvedRunnerArguments<A> : never : never
    ) => Promise<RxResolvedRunner<InstanceType<RR>>>;

    declare protected runnerControllers: Set<RxRunnerController<R>>;
    protected readonly RunnerControllerConstructor = RxRunnerController;
    protected readonly errorSerializer = RX_WORKER_RUNNER_ERROR_SERIALIZER;
}
