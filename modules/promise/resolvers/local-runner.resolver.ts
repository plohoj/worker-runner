import { AvailableRunnersFromList, LocalResolverBridge, ResolvedRunner, StrictRunnersList } from '@worker-runner/core';
import { ClientRunnerResolver } from './client-runner.resolver';
import { HostRunnerResolver } from './host-runner.resolver';

interface ILocalRunnerResolverConfig<L extends StrictRunnersList> {
    runners: L
}

export class LocalRunnerResolver<L extends StrictRunnersList> extends ClientRunnerResolver<L> {
    declare public wrapRunner: <R extends InstanceType<AvailableRunnersFromList<L>>>(runnerInstance: R) => ResolvedRunner<R>;

    declare protected resolverBridge?: LocalResolverBridge<L>;

    constructor(config: ILocalRunnerResolverConfig<L>) {
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
