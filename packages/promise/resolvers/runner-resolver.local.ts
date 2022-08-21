import { AvailableRunnersFromList, ResolvedRunner, RunnerConstructor, RunnerIdentifierConfigList, PortalConnectionClient, LocalPortalConnectionChannel, PortalConnectionHost, ConnectionClosedError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { IPluginHost } from '@worker-runner/core/plugins/plugins.type';
import { RunnerResolverClient } from './runner-resolver.client';
import { RunnerResolverHost } from './runner-resolver.host';

interface IRunnerResolverLocalConfig<L extends RunnerIdentifierConfigList> {
    runners?: L
    plugins?: IPluginHost[],
}

export class RunnerResolverLocal<L extends RunnerIdentifierConfigList = []> extends RunnerResolverClient<L> {

    private host: RunnerResolverHost<L>;

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

    // TODO Need to implement the configuration token after adding constructing resolver/
    /**
     * Wraps the Runner and returns a Runner control object that will call the methods of the original Runner instance.
     * The original Runner instance will be executed in the same area in which it was wrapped.
     */
    public wrapRunner<R extends InstanceType<AvailableRunnersFromList<L> | RunnerConstructor>>(
        runnerInstance: R
    ): ResolvedRunner<R> { // TODO extract method
        if (!this.connectedResolver) {
            throw new ConnectionClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
            });
        }
        const localChannels = LocalPortalConnectionChannel.build();
        const resolvedRunner = this.connectedResolver
            .wrapRunner(runnerInstance, localChannels[0]) as ResolvedRunner<R>;
        this.host.wrapRunner(runnerInstance, localChannels[1]);
        return resolvedRunner;
    }
}
