import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { IBaseConnectionHost, IEstablishedConnectionHostData } from '../../connections/base/base.connection-host';
import { DisconnectReason } from '../../connections/base/disconnect-reason';
import { ConnectionClosedError, RunnerResolverHostDestroyError } from '../../errors/runner-errors';
import { isInterceptPlugin } from '../../plugins/intercept-plugin/intercept.plugin';
import { IPlugin } from '../../plugins/plugins';
import { RunnerDefinitionCollection } from '../../runner/runner-definition.collection';
import { RunnerConstructor } from '../../types/constructor';
import { AllRunnersFromList, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { ErrorCollector } from '../../utils/error-collector';
import { parallelPromises } from '../../utils/parallel-promises';
import { ConnectedRunnerResolverHost } from './connected-runner-resolver.host';

export type IRunnerResolverHostConfigBase<L extends RunnerIdentifierConfigList> = {
    connection: IBaseConnectionHost;
    plugins?: IPlugin[];
} & ({
    runners: L
} | {
    /**
     * @inner A collection of Runner definitions.
     * Used for Local Resolver of Runners, so that when a previously unknown Runner is wrapped,
     * the host area will instantly get information about the Runner
     */
    runnerDefinitionCollection: RunnerDefinitionCollection<L>
});

export abstract class RunnerResolverHostBase<L extends RunnerIdentifierConfigList> {
    
    protected readonly runnerDefinitionCollection: RunnerDefinitionCollection<L>;

    private readonly connection: IBaseConnectionHost;
    private readonly connectedResolvers = new Set<ConnectedRunnerResolverHost>();
    private readonly plugins?: IPlugin[];

    constructor(config: IRunnerResolverHostConfigBase<L>) {
        this.runnerDefinitionCollection = 'runners' in config
            ? new RunnerDefinitionCollection({ runners: config.runners })
            : config.runnerDefinitionCollection;
        this.plugins = config.plugins;
        this.connection = config.connection;
        this.connection.registerPlugins?.(
            this.plugins?.filter(isInterceptPlugin) || []
        );
    }

    /**
     * Launches the listening connection specified in the configuration
     * through which communication with RunnerResolver in the client area will happen
     */
    public run(): void {
        this.connection.startListen(this.newConnectionHandler);
    }

    /**
     * Destroying of all resolved Runners instance.
     * After destroying all instances of resolved Runners, the host area informs all client areas to stop communicating.
     * After the communication is terminated, it can be restarted using the {@link run} method.
     *
     * WARNING: The original connection through which the communication happens will not be closed,
     * it must be closed manually.
     */
    public async destroy(): Promise<void> {
        try {
            await parallelPromises({
                values: this.connectedResolvers,
                stopAtFirstError: false,
                mapper: connectedResolver => connectedResolver.handleDestroy(),
                errorCollector: new ErrorCollector(
                    originalErrors => new RunnerResolverHostDestroyError({originalErrors})
                ),
            })
        } finally {
            await this.connection.stop?.();
        }
    }

    /**
     * @inner Method that establishes a connection for asynchronous control of a Runner instance
     * that has already been created outside of the Runner Resolver.
     * Used for Local Resolver.
     */
    public wrapRunner(
        runnerInstance: InstanceType<AllRunnersFromList<L> | RunnerConstructor>,
        connectionChannel: IBaseConnectionChannel,
    ): void {
        const connectedResolver = this.connectedResolvers.values().next().value as ConnectedRunnerResolverHost | undefined;
        if (!connectedResolver) {
            throw new ConnectionClosedError({ disconnectReason: DisconnectReason.ConnectionNotYetEstablished });
        }
        connectedResolver.wrapRunner(runnerInstance, connectionChannel);
    }

    private readonly newConnectionHandler = (newConnectionData: IEstablishedConnectionHostData) => {
        const connectedResolver: ConnectedRunnerResolverHost = new ConnectedRunnerResolverHost({
            connectionChannel: newConnectionData.connectionChannel,
            connectionStrategy: newConnectionData.connectionStrategy,
            runnerDefinitionCollection: this.runnerDefinitionCollection,
            plugins: this.plugins,
        });
        connectedResolver.destroyHandlerController.addHandler(() => this.connectedResolvers.delete(connectedResolver));
        connectedResolver.run();

        this.connectedResolvers.add(connectedResolver);
    }
}
