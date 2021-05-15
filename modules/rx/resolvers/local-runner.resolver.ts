import { AvailableRunnersFromList, LocalResolverBridge, StrictRunnersList } from '@worker-runner/core';
import { RxResolvedRunner } from '../runners/resolved-runner';
import { RxClientRunnerResolver } from './client-runner.resolver';
import { RxHostRunnerResolver } from './host-runner.resolver';

interface IRxLocalRunnerResolverConfig<L extends StrictRunnersList> {
    runners: L
}

export class RxLocalRunnerResolver<L extends StrictRunnersList> extends RxClientRunnerResolver<L> {
    declare public wrapRunner: <R extends InstanceType<AvailableRunnersFromList<L>>>(runnerInstance: R) => RxResolvedRunner<R>;
    declare protected resolverBridge?: LocalResolverBridge<L>;

    constructor(config: IRxLocalRunnerResolverConfig<L>) {
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
