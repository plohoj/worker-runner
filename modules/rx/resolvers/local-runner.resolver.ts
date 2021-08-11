import { AvailableRunnerIdentifier, AvailableRunnersFromList, LocalResolverBridge, RunnerConstructor, RunnerByIdentifier, RunnerIdentifierConfigList, InstanceTypeOrUnknown } from '@worker-runner/core';
import { RxResolvedRunner } from '../runners/resolved-runner';
import { RxClientRunnerResolver, RxRunnerArguments } from './client-runner.resolver';
import { RxHostRunnerResolver } from './host/host-runner.resolver';

interface IRxLocalRunnerResolverConfig<L extends RunnerIdentifierConfigList> {
    runners?: L
}

export class RxLocalRunnerResolver<L extends RunnerIdentifierConfigList = []> extends RxClientRunnerResolver<L> {

    declare public wrapRunner: <R extends InstanceType<AvailableRunnersFromList<L> | RunnerConstructor>>(
        runnerInstance: R
    ) => RxResolvedRunner<R>;
    declare public resolve: <I extends AvailableRunnerIdentifier<L>>(
        identifier: I,
        ...args: RxRunnerArguments<RunnerByIdentifier<L, I>>
    ) => Promise<RxResolvedRunner<InstanceTypeOrUnknown<RunnerByIdentifier<L, I>>>>;

    declare protected resolverBridge?: LocalResolverBridge<L>;

    constructor(config?: IRxLocalRunnerResolverConfig<L>) {
        super({
            connection: self,
            ...config,
        });
    }

    protected override buildResolverBridge(): void {
        this.resolverBridge = new LocalResolverBridge({
            hostRunnerResolverFactory: config => new RxHostRunnerResolver({
                ...config,
                runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            }),
        });
    }
}
