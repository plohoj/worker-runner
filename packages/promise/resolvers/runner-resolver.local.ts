import { AvailableRunnersFromList, IPlugin, LocalPortalConnectionChannel, PortalConnectionClient, PortalConnectionHost, ResolvedRunner, RunnerConstructor, RunnerIdentifierConfigList, runnerResolverLocalWrapRunnerFunction } from '@worker-runner/core';
import { RunnerResolverClient } from './runner-resolver.client';
import { RunnerResolverHost } from './runner-resolver.host';

interface IRunnerResolverLocalConfig<L extends RunnerIdentifierConfigList> {
    runners?: L
    plugins?: IPlugin[],
}

export class RunnerResolverLocal<L extends RunnerIdentifierConfigList = []> extends RunnerResolverClient<L> {
    /**
     * Wraps the Runner and returns a Runner control object that will call the methods of the original Runner instance.
     * The original Runner instance will be executed in the same area in which it was wrapped.
     */
    declare public wrapRunner: <R extends InstanceType<AvailableRunnersFromList<L> | RunnerConstructor>>(
        runnerInstance: R
    ) => ResolvedRunner<R>;

    private readonly host: RunnerResolverHost<L>;

    constructor(config?: IRunnerResolverLocalConfig<L>) {
        const localChannels = LocalPortalConnectionChannel.build();
        super({
            connection: new PortalConnectionClient({
                connectionChannel: localChannels[0],
            }),
            ...config,
        });
        this.host = new RunnerResolverHost({
            connection: new PortalConnectionHost({
                connectionChannel: localChannels[1]
            }),
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            plugins: config?.plugins,
        });
    }

    public override run(): void {
        this.host.run();
        void super.run();
    }
}

RunnerResolverLocal.prototype.wrapRunner
    = runnerResolverLocalWrapRunnerFunction as typeof RunnerResolverLocal.prototype.wrapRunner;
