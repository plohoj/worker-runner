import { AvailableRunnersFromList, RunnerResolverBridgeLocal, ResolvedRunner, RunnerConstructor, RunnerIdentifierConfigList } from '@worker-runner/core';
import { RunnerResolverClient } from './runner-resolver.client';
import { RunnerResolverHost } from './runner-resolver.host';

interface IRunnerResolverLocalConfig<L extends RunnerIdentifierConfigList> {
    runners?: L
}

export class RunnerResolverLocal<L extends RunnerIdentifierConfigList = []> extends RunnerResolverClient<L> {

    declare public wrapRunner: <R extends InstanceType<AvailableRunnersFromList<L> | RunnerConstructor>>(
        runnerInstance: R
    ) => ResolvedRunner<R>;

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
