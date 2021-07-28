import { AvailableRunnerIdentifier, AvailableRunnersFromList, LocalResolverBridge, ResolvedRunner, StrictRunnerByIdentifier, StrictRunnersList } from '@worker-runner/core';
import { ClientRunnerResolver, RunnerArguments } from './client-runner.resolver';
import { HostRunnerResolver } from './host-runner.resolver';

interface ILocalRunnerResolverConfig<L extends StrictRunnersList> {
    runners: L
}

export class LocalRunnerResolver<L extends StrictRunnersList> extends ClientRunnerResolver<L> {

    declare public wrapRunner: <R extends InstanceType<AvailableRunnersFromList<L>>>(runnerInstance: R) => ResolvedRunner<R>;
    
    declare public resolve: <I extends AvailableRunnerIdentifier<L>>(
        identifier: I,
        ...args: RunnerArguments<StrictRunnerByIdentifier<L, I>>
    ) => Promise<ResolvedRunner<InstanceType<StrictRunnerByIdentifier<L, I>>>>;

    declare protected resolverBridge?: LocalResolverBridge<L>;

    constructor(config: ILocalRunnerResolverConfig<L>) {
        super({
            connection: self,
            ...config,
        });
    }

    protected override buildResolverBridge(): void {
        this.resolverBridge = new LocalResolverBridge({
            hostRunnerResolverFactory: config => new HostRunnerResolver({
                ...config,
                runners: this.runnersListController.getRunnerList() as unknown as L,
            }),
        });
    }
}
