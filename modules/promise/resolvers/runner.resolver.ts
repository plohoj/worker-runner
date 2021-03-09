import { IClientRunnerResolverConfigBase, RunnersList } from '@worker-runner/core';
import { ClientRunnerResolver } from './client-runner.resolver';
import { HostRunnerResolver } from './host-runner.resolver';

/**
 * @deprecated
 * @see ClientRunnerResolver
 * @see HostRunnerResolver
 */
export class RunnerResolver<L extends RunnersList> extends ClientRunnerResolver<L> {
    private hostRunnerResolver: HostRunnerResolver<L>;

    constructor(config: IClientRunnerResolverConfigBase<L>) {
        super(config);
        this.hostRunnerResolver = new HostRunnerResolver(config);
    }

    public runInWorker(): void {
        this.hostRunnerResolver.run();
    }
}
