import { AvailableRunnerIdentifier, AvailableRunnersFromList, LocalResolverBridge, StrictRunnerByIdentifier, StrictRunnersList } from '@worker-runner/core';
import { RxResolvedRunner } from '../runners/resolved-runner';
import { RxClientRunnerResolver, RxRunnerArguments } from './client/client-runner.resolver';
import { RxHostRunnerResolver } from './host/host-runner.resolver';

interface IRxLocalRunnerResolverConfig<L extends StrictRunnersList> {
    runners: L
}

export class RxLocalRunnerResolver<L extends StrictRunnersList> extends RxClientRunnerResolver<L> {

    declare public wrapRunner: <R extends InstanceType<AvailableRunnersFromList<L>>>(runnerInstance: R) => RxResolvedRunner<R>;
    declare public resolve: <I extends AvailableRunnerIdentifier<L>>(
        identifier: I,
        ...args: RxRunnerArguments<StrictRunnerByIdentifier<L, I>>
    ) => Promise<RxResolvedRunner<InstanceType<StrictRunnerByIdentifier<L, I>>>>;

    declare protected resolverBridge?: LocalResolverBridge<L>;

    constructor(config: IRxLocalRunnerResolverConfig<L>) {
        super(config);
    }

    protected override buildResolverBridge(): void {
        this.resolverBridge = new LocalResolverBridge({
            hostRunnerResolverFactory: config => new RxHostRunnerResolver({
                ...config,
                runners: this.runnersListController.getRunnerList() as unknown as L,
            }),
        });
    }
}
