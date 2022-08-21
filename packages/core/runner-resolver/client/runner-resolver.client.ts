import { IPluginClient } from '@worker-runner/core/plugins/plugins.type';
import { BaseConnectionClient, IEstablishedConnectionClientData } from '../../connections/base/base.connection-client';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ConnectionClosedError } from '../../errors/runner-errors';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { RunnerController } from '../../runner/runner.controller';
import { IRunnerParameter } from '../../types/constructor';
import { AvailableRunnerIdentifier, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { ConnectedRunnerResolverClient } from './connected-runner-resolver.client';

export type IRunnerResolverClientBaseConfig<L extends RunnerIdentifierConfigList> = {
    connection: BaseConnectionClient
    runners?: L;
    plugins?: IPluginClient[];
};

export class RunnerResolverClientBase<L extends RunnerIdentifierConfigList>  {

    protected readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    protected connectedResolver?: ConnectedRunnerResolverClient;

    private readonly connection: BaseConnectionClient;
    private readonly plugins?: IPluginClient[];

    constructor(config: IRunnerResolverClientBaseConfig<L>) {
        this.runnerIdentifierConfigCollection = new RunnerIdentifierConfigCollection({
            runners: config.runners || [],
        });
        this.connection = config.connection;
        this.plugins = config.plugins;
    }

    /** Launches and prepares RunnerResolver for work */
    public run(): Promise<void> | void {
        const establishedConnectionData$ = this.connection.connect();
        if (establishedConnectionData$ instanceof Promise) {
            return establishedConnectionData$
                .then(establishedConnectionData => this.buildAndRunConnectedResolver(establishedConnectionData));
        }
        this.buildAndRunConnectedResolver(establishedConnectionData$);
    }

    /** Returns a runner control object that will call the methods of the source instance */
    public async resolve(identifier: AvailableRunnerIdentifier<L>, ...args: IRunnerParameter[]): Promise<RunnerController> {
        if (!this.connectedResolver) { // TODO Check connection validation everywhere
            throw new ConnectionClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
            });
        }
        return this.connectedResolver.resolve(identifier, ...args);
    }

    /** Destroying of all resolved Runners instance */
    public async destroy(): Promise<void> {
        try {
            if (!this.connectedResolver) {
                throw new ConnectionClosedError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
                });
            }
            try {
                await this.connectedResolver.destroy();
            } finally {
                this.connectedResolver = undefined;
            }
        } finally {
            await this.connection.stop?.();
        }
    }

    private buildAndRunConnectedResolver(establishedConnectionData: IEstablishedConnectionClientData): void {
        this.connectedResolver = new ConnectedRunnerResolverClient({
            connectionChannel: establishedConnectionData.connectionChannel,
            connectionStrategy: establishedConnectionData.strategy,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            plugins: this.plugins,
        });
        this.connectedResolver.run();
    }
}
