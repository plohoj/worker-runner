import { RunnerResolverHostBase, RunnerIdentifierConfigList, IRunnerResolverHostConfigBase } from '@worker-runner/core';
import { RxWorkerRunnerPlugin } from '../plugins/rx-worker-runner-plugin';

export class RxRunnerResolverHost<L extends RunnerIdentifierConfigList> extends RunnerResolverHostBase<L> {

    constructor(config: IRunnerResolverHostConfigBase<L>) {
        super({
            ...config,
            plugins: [
                ...(config.plugins || []),
                new RxWorkerRunnerPlugin(),
            ],
        });
    }
}
