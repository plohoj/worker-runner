import { AvailableRunnersFromList, BaseConnectionStrategyHost, IPlugin, LocalPortalConnectionChannel, MessageChannelConnectionStrategyHost, PortalConnectionClient, PortalConnectionHost, RunnerConstructor, RunnerIdentifierConfigList, RunnerResolverHostBase, runnerResolverLocalWrapRunnerFunction } from '@worker-runner/core';
import { RxResolvedRunner } from '../runner/resolved-runner';
import { RxRunnerResolverClient } from './runner-resolver.client';
import { RxRunnerResolverHost } from './runner-resolver.host';

interface IRxRunnerResolverLocalConfig<L extends RunnerIdentifierConfigList> {
    runners?: L
    plugins?: IPlugin[],
    connectionStrategy?: BaseConnectionStrategyHost;
}

export class RxRunnerResolverLocal<L extends RunnerIdentifierConfigList = []> extends RxRunnerResolverClient<L> {

    /**
     * Wraps the Runner and returns a Runner control object that will call the methods of the original Runner instance.
     * The original Runner instance will be executed in the same area in which it was wrapped.
     */
    declare public wrapRunner: <R extends InstanceType<AvailableRunnersFromList<L> | RunnerConstructor>>(
        runnerInstance: R
    ) => RxResolvedRunner<R>;

    private readonly host: RunnerResolverHostBase<L>;

    constructor(config?: IRxRunnerResolverLocalConfig<L>) {
        const localChannels = LocalPortalConnectionChannel.build();
        const connectionStrategy = config?.connectionStrategy || new MessageChannelConnectionStrategyHost()
        super({
            connection: new PortalConnectionClient({
                connectionChannel: localChannels[0],
                connectionStrategy: connectionStrategy.strategyClient,
            }),
            ...config,
        });
        this.host = new RxRunnerResolverHost({
            connection: new PortalConnectionHost({
                connectionChannel: localChannels[1],
                connectionStrategy: connectionStrategy,
            }),
            runnerDefinitionCollection: this.runnerDefinitionCollection,
            plugins: config?.plugins,
        });
    }

    public override run(): void {
        this.host.run();
        void super.run();
    }

}

RxRunnerResolverLocal.prototype.wrapRunner
    = runnerResolverLocalWrapRunnerFunction as typeof RxRunnerResolverLocal.prototype.wrapRunner;
