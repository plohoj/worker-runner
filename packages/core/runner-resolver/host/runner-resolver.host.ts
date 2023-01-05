import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionHost, IEstablishedConnectionHostData } from '../../connections/base/base.connection-host';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ConnectionClosedError, RunnerResolverHostDestroyError } from '../../errors/runner-errors';
import { IPlugin } from '../../plugins/plugins.type';
import { RunnerDefinitionCollection } from '../../runner/runner-definition.collection';
import { RunnerConstructor } from '../../types/constructor';
import { AvailableRunnersFromList, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { parallelPromises } from '../../utils/parallel.promises';
import { ConnectedRunnerResolverHost } from './connected-runner-resolver.host';

export type IRunnerResolverHostConfigBase<L extends RunnerIdentifierConfigList> = {
    connection: BaseConnectionHost;
    plugins?: IPlugin[];
} & ({
    runners: L
} | {
    runnerDefinitionCollection: RunnerDefinitionCollection<L>
});

export abstract class RunnerResolverHostBase<L extends RunnerIdentifierConfigList> {
    
    protected readonly runnerDefinitionCollection: RunnerDefinitionCollection<L>;

    private readonly connection: BaseConnectionHost;
    private readonly connectedResolvers = new Set<ConnectedRunnerResolverHost>();
    private readonly plugins?: IPlugin[];

    constructor(config: IRunnerResolverHostConfigBase<L>) {
        this.runnerDefinitionCollection = 'runners' in config
            ? new RunnerDefinitionCollection({ runners: config.runners })
            : config.runnerDefinitionCollection;
        this.connection = config.connection;
        this.plugins = config.plugins;
    }

    public run(): void {
        this.connection.startListen(this.newConnectionHandler);
    }

    public async destroy(): Promise<void> {
        try {
            await parallelPromises({
                values: this.connectedResolvers,
                stopAtFirstError: false,
                mapper: connectedResolver => connectedResolver.handleDestroy(),
                errorFactory: originalErrors => new RunnerResolverHostDestroyError({originalErrors}),
            })
        } finally {
            await this.connection.stop?.();
        }
    }

    public wrapRunner(
        runnerInstance: InstanceType<AvailableRunnersFromList<L> | RunnerConstructor>,
        connectionChannel: BaseConnectionChannel,
    ): void {
        const connectedResolver = this.connectedResolvers.values().next().value as ConnectedRunnerResolverHost | undefined;
        if (!connectedResolver) {
            throw new ConnectionClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
            });
        }
        connectedResolver.wrapRunner(runnerInstance, connectionChannel);
    }

    private readonly newConnectionHandler = (newConnectionData: IEstablishedConnectionHostData) => {
        const connectedResolver: ConnectedRunnerResolverHost = new ConnectedRunnerResolverHost({
            connectionChannel: newConnectionData.connectionChannel,
            connectionStrategy: newConnectionData.connectionStrategy,
            runnerDefinitionCollection: this.runnerDefinitionCollection,
            plugins: this.plugins,
            onDestroy: () => this.connectedResolvers.delete(connectedResolver),
        });
        connectedResolver.run();

        this.connectedResolvers.add(connectedResolver);
    }
}
