import { IClientRunnerResolverConfigBase, StrictRunnersList } from '@worker-runner/core';
import { RxClientRunnerResolver } from './client-runner.resolver';
import { RxHostRunnerResolver } from './host-runner.resolver';

/**
 * @deprecated
 * @see RxClientRunnerResolver
 * @see RxHostRunnerResolver
 */
export class RxRunnerResolver<L extends StrictRunnersList> extends RxClientRunnerResolver<L> {
    private hostRunnerResolver: RxHostRunnerResolver<L>;

    constructor(config: IClientRunnerResolverConfigBase<L>) {
        super(config);
        this.hostRunnerResolver = new RxHostRunnerResolver(config);
    }

    public runInWorker(): void {
        this.hostRunnerResolver.run();
    }
}
