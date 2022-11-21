import { ActionController } from '../../action-controller/action-controller';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ConnectionClosedError } from '../../errors/runner-errors';
import { PluginsResolver } from '../../plugins/resolver/plugins.resolver';
import { RunnerIdentifierConfigCollection } from "../../runner/runner-identifier-config.collection";
import { DisconnectErrorFactory } from '../../types/disconnect-error-factory';
import { AnyRunnerFromList, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { IRunnerEnvironmentClientPartFactoryConfig, RunnerEnvironmentClient, RunnerEnvironmentClientPartFactory } from "./runner-environment.client";

export interface IRunnerEnvironmentClientCollectionConfig<L extends RunnerIdentifierConfigList> {
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    connectionStrategy: BaseConnectionStrategyClient,
    pluginsResolver: PluginsResolver;
}

export class RunnerEnvironmentClientCollection<L extends RunnerIdentifierConfigList = RunnerIdentifierConfigList> {

    public readonly runnerEnvironmentClientPartFactory: RunnerEnvironmentClientPartFactory<AnyRunnerFromList<L>>;
    public readonly runnerEnvironmentClients = new Set<RunnerEnvironmentClient<AnyRunnerFromList<L>>>();

    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    private readonly connectionStrategy: BaseConnectionStrategyClient;
    private readonly pluginsResolver: PluginsResolver;

    constructor(config: IRunnerEnvironmentClientCollectionConfig<L>) {
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.connectionStrategy = config.connectionStrategy;
        this.pluginsResolver = config.pluginsResolver;
        this.runnerEnvironmentClientPartFactory = this.initRunnerEnvironmentClientByPartConfig;
    }
    
    /**
     * Build a {@link RunnerEnvironmentClient} and adds it to the collection.
     * Building occurs **without initialization**
     */
    public buildRunnerEnvironmentClientByPartConfig(
        config: IRunnerEnvironmentClientPartFactoryConfig
    ): RunnerEnvironmentClient<AnyRunnerFromList<L>> {
        const disconnectErrorFactory: DisconnectErrorFactory = (error: ConnectionClosedError): ConnectionClosedError => 
            new ConnectionClosedError({
                ...error,
                // eslint-disable-next-line @typescript-eslint/unbound-method
                captureOpt: this.buildRunnerEnvironmentClientByPartConfig,
                message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                    token: config.token,
                    runnerName: this.runnerIdentifierConfigCollection.getRunnerConstructorSoft(config.token)?.name,
                })
            });
        const actionController = new ActionController({
            connectionChannel: config.connectionChannel,
            disconnectErrorFactory,
        })
        const environmentClient: RunnerEnvironmentClient<AnyRunnerFromList<L>> = new RunnerEnvironmentClient({
            token: config.token,
            actionController,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            connectionStrategy: this.connectionStrategy,
            pluginsResolver: this.pluginsResolver,
            disconnectErrorFactory,
            runnerEnvironmentClientPartFactory: this.runnerEnvironmentClientPartFactory,
            onDestroyed: () => this.runnerEnvironmentClients.delete(environmentClient),
        });
        // At the time of initialization, the environment client can receive the destroy action, so need to:
        // * Add environment to the list
        // * If an error thrown during initialization, remove the environment from the list again.
        // If destroying occurs after successful initialization,
        // the environment will be removed from the list by calling the onDestroyed method.
        // TODO can be added after destroy environment collection
        this.runnerEnvironmentClients.add(environmentClient);
        return environmentClient;
    }

    /**
     * **Initializes** a {@link RunnerEnvironmentClient} and adds it to the collection.
     */
    public initRunnerEnvironmentClientByPartConfig = async (
        config: IRunnerEnvironmentClientPartFactoryConfig
    ): Promise<RunnerEnvironmentClient<AnyRunnerFromList<L>>> => {
        const environmentClient = this.buildRunnerEnvironmentClientByPartConfig(config);
        try {
            await environmentClient.initAsync();
        } catch (error) {
            this.runnerEnvironmentClients.delete(environmentClient);
            throw error;
        }
        return environmentClient;
    }
}
