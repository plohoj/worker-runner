import { AnyRunnerFromList, IRunnerResolverConfigBase, LocalResolverBridge, ResolvedRunner, RunnersList } from '@worker-runner/core';
import { ClientRunnerResolver } from './client-runner.resolver';
import { HostRunnerResolver } from './host-runner.resolver';

export class LocalRunnerResolver<L extends RunnersList> extends ClientRunnerResolver<L> {
    declare public wrapRunner: <R extends InstanceType<AnyRunnerFromList<L>>>(runnerInstance: R) => ResolvedRunner<R>;

    declare protected resolverBridge?: LocalResolverBridge<L>;

    constructor(config: IRunnerResolverConfigBase<L>) {
        super(config);
    }

    protected buildResolverBridge(): void {
        this.resolverBridge = new LocalResolverBridge({
            hostRunnerResolverFactory: config => new HostRunnerResolver({
                ...config,
                runners: this.runnersListController.getRunnerList() as unknown as L,
            }),
        });
    }
}
