import { AvailableRunnersFromList, RunnerResolverBridgeLocal, RunnerConstructor, RunnerIdentifierConfigList } from '@worker-runner/core';
import { RxResolvedRunner } from '../runner/resolved-runner';
import { RxRunnerResolverClient } from './runner-resolver.client';
import { RxRunnerResolverHost } from './runner-resolver.host';

interface IRxRunnerResolverLocalConfig<L extends RunnerIdentifierConfigList> {
    runners?: L
}

export class RxRunnerResolverLocal<L extends RunnerIdentifierConfigList = []> extends RxRunnerResolverClient<L> {

    declare public wrapRunner: <R extends InstanceType<AvailableRunnersFromList<L> | RunnerConstructor>>(
        runnerInstance: R
    ) => RxResolvedRunner<R>;

    declare protected resolverBridge?: RunnerResolverBridgeLocal<L>;

    constructor(config?: IRxRunnerResolverLocalConfig<L>) {
        super({
            connection: self,
            ...config,
        });
    }

    protected override buildResolverBridge(): void {
        this.resolverBridge = new RunnerResolverBridgeLocal({
            runnerResolverHostFactory: config => new RxRunnerResolverHost({
                ...config,
                runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            }),
        });
    }
}
