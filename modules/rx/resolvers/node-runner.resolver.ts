import { IRunnerControllerConfig, NodeRunnerResolverBase, RunnerConstructor } from '@worker-runner/core';
import { RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RxRunnerController } from '../runners/controller/runner.controller';
import { IRxRunnerSerializedParameter, RxResolvedRunner, RxResolvedRunnerArguments } from '../types/resolved-runner';

export class RxNodeRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolverBase<R> {

    declare public resolve: <RR extends R>(
        runner: RR,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: RR extends new (...args: infer A) => any
            ? A extends Array<IRxRunnerSerializedParameter>
                ? RxResolvedRunnerArguments<A>
                : never
            : never,
    ) => Promise<RxResolvedRunner<InstanceType<RR>>>;

    declare protected runnerControllers: Set<RxRunnerController<R>>;
    protected readonly errorSerializer = RX_WORKER_RUNNER_ERROR_SERIALIZER;

    protected runnerControllerFactory(config: IRunnerControllerConfig<R>): RxRunnerController<R> {
        return new RxRunnerController(config);
    }
}
