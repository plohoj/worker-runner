import { AnyRunnerFromList, IRunnerResolverConfigBase, LocalResolverBridge, RunnersList } from '@worker-runner/core';
import { RxResolvedRunner } from '../runners/resolved-runner';
import { RxClientRunnerResolver } from './client-runner.resolver';
import { RxHostRunnerResolver } from './host-runner.resolver';

export class RxLocalRunnerResolver<L extends RunnersList> extends RxClientRunnerResolver<L> {
    declare public wrapRunner: <R extends InstanceType<AnyRunnerFromList<L>>>(runnerInstance: R) => RxResolvedRunner<R>;
    declare protected resolverBridge?: LocalResolverBridge<L>;

    constructor(config: IRunnerResolverConfigBase<L>) {
        super(config);
    }

    protected buildResolverBridge(): void {
        this.resolverBridge = new LocalResolverBridge({
            hostRunnerResolverFactory: config => new RxHostRunnerResolver({
                ...config,
                runners: this.runnersListController.getRunnerList() as unknown as L,
            }),
        });
    }
}
