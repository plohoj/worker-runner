import { RunnerResolverClientBase, RunnerConstructor, RunnerIdentifierConfigList, RunnerByIdentifier, InstanceTypeOrUnknown, AvailableRunnerIdentifier, IRunnerResolverClientBaseConfig } from '@worker-runner/core';
import { RxWorkerRunnerPlugin } from '../plugins/rx-worker-runner-plugin';
import { RxResolvedRunner, RxResolvedRunnerArguments } from '../runner/resolved-runner';

export type RxRunnerArguments<R extends RunnerConstructor>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    = R extends RunnerConstructor<any, infer A>
        ? RxResolvedRunnerArguments<A>
        : never;

export class RxRunnerResolverClient<L extends RunnerIdentifierConfigList = []> extends RunnerResolverClientBase<L> {

    declare public resolve: <I extends AvailableRunnerIdentifier<L>>(
        identifier: I,
        ...args: RxRunnerArguments<RunnerByIdentifier<L, I>>
    ) => Promise<RxResolvedRunner<InstanceTypeOrUnknown<RunnerByIdentifier<L, I>>>>;

    constructor(config: IRunnerResolverClientBaseConfig<L>) {
        super({
            ...config,
            plugins: [
                ...(config.plugins || []),
                new RxWorkerRunnerPlugin(),
            ],
        });
    }
}
