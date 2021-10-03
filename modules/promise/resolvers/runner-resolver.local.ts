import { AvailableRunnerIdentifier, AvailableRunnersFromList, RunnerResolverBridgeLocal, ResolvedRunner, RunnerConstructor, RunnerByIdentifier, RunnerIdentifierConfigList, InstanceTypeOrUnknown } from '@worker-runner/core';
import { RunnerResolverClient, RunnerArguments } from './runner-resolver.client';
import { RunnerResolverHost } from './runner-resolver.host';

interface IRunnerResolverLocalConfig<L extends RunnerIdentifierConfigList> {
    runners?: L
}

export class RunnerResolverLocal<L extends RunnerIdentifierConfigList = []> extends RunnerResolverClient<L> {

    declare public wrapRunner: <R extends InstanceType<AvailableRunnersFromList<L> | RunnerConstructor>>(
        runnerInstance: R
    ) => ResolvedRunner<R>;
    declare public resolve: <I extends AvailableRunnerIdentifier<L>>(
        identifier: I,
        ...args: RunnerArguments<RunnerByIdentifier<L, I>>
    ) => Promise<ResolvedRunner<InstanceTypeOrUnknown<RunnerByIdentifier<L, I>>>>;

    declare protected resolverBridge?: RunnerResolverBridgeLocal<L>;

    constructor(config?: IRunnerResolverLocalConfig<L>) {
        super({
            connection: self,
            ...config,
        });
    }

    protected override buildResolverBridge(): void {
        this.resolverBridge = new RunnerResolverBridgeLocal({
            runnerResolverHostFactory: config => new RunnerResolverHost({
                ...config,
                runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            }),
        });
    }
}
