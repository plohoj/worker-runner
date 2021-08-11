import { AvailableRunnerIdentifier, AvailableRunnersFromList, LocalResolverBridge, ResolvedRunner, RunnerConstructor, RunnerByIdentifier, RunnerIdentifierConfigList, InstanceTypeOrUnknown } from '@worker-runner/core';
import { ClientRunnerResolver, RunnerArguments } from './client-runner.resolver';
import { HostRunnerResolver } from './host-runner.resolver';

interface ILocalRunnerResolverConfig<L extends RunnerIdentifierConfigList> {
    runners?: L
}

export class LocalRunnerResolver<L extends RunnerIdentifierConfigList = []> extends ClientRunnerResolver<L> {

    declare public wrapRunner: <R extends InstanceType<AvailableRunnersFromList<L> | RunnerConstructor>>(
        runnerInstance: R
    ) => ResolvedRunner<R>;
    declare public resolve: <I extends AvailableRunnerIdentifier<L>>(
        identifier: I,
        ...args: RunnerArguments<RunnerByIdentifier<L, I>>
    ) => Promise<ResolvedRunner<InstanceTypeOrUnknown<RunnerByIdentifier<L, I>>>>;

    declare protected resolverBridge?: LocalResolverBridge<L>;

    constructor(config?: ILocalRunnerResolverConfig<L>) {
        super({
            connection: self,
            ...config,
        });
    }

    protected override buildResolverBridge(): void {
        this.resolverBridge = new LocalResolverBridge({
            hostRunnerResolverFactory: config => new HostRunnerResolver({
                ...config,
                runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            }),
        });
    }
}
