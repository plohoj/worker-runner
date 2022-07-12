import { ArgumentsSerializer } from '../../arguments-serialization/arguments-serializer';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { BaseConnectionClient, IEstablishedConnectionClientData } from '../../connections/base/base.connection-client';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { ConnectionClosedError } from '../../errors/runner-errors';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { RunnerController } from '../../runner/runner.controller';
import { IRunnerParameter } from '../../types/constructor';
import { AvailableRunnerIdentifier, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { ConnectedRunnerResolverClient } from './connected-runner-resolver.client';

export type IRunnerResolverClientBaseConfig<L extends RunnerIdentifierConfigList> = {
    connection: BaseConnectionClient
    runners?: L;
};

export class RunnerResolverClientBase<L extends RunnerIdentifierConfigList>  {
    
    protected readonly errorSerializer: ErrorSerializer = this.buildErrorSerializer();
    protected readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    protected connectedResolver?: ConnectedRunnerResolverClient;
    
    private readonly connection: BaseConnectionClient;
    private readonly argumentSerializerByStrategyMap
        = new Map<BaseConnectionStrategyClient, ArgumentsSerializer>();

    constructor(config: IRunnerResolverClientBaseConfig<L>) {
        this.runnerIdentifierConfigCollection = new RunnerIdentifierConfigCollection({
            runners: config.runners || [],
        });
        this.connection = config.connection;
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
    public resolve(identifier: AvailableRunnerIdentifier<L>, ...args: IRunnerParameter[]): Promise<RunnerController> {
        if (!this.connectedResolver) { // TODO Check connection validation everywhere
            throw new ConnectionClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
            });
        }
        return this.connectedResolver.resolve(identifier, ...args);
    }

    /** Destroying of all resolved Runners instance */
    public destroy(): Promise<void> {
        if (!this.connectedResolver) {
            throw new ConnectionClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
            });
        }
        return this.connectedResolver.destroy();
    }

    protected buildErrorSerializer(): ErrorSerializer {
        return WORKER_RUNNER_ERROR_SERIALIZER;
    }

    private getOrCreateSerializerByConnectionStrategy(
        strategy: BaseConnectionStrategyClient
    ): ArgumentsSerializer {
        let serializer = this.argumentSerializerByStrategyMap.get(strategy);
        if (!serializer) {
            serializer =  new ArgumentsSerializer({connectionStrategy: strategy});
            this.argumentSerializerByStrategyMap.set(strategy, serializer);
        }
        return serializer;
    }

    private buildAndRunConnectedResolver(establishedConnectionData: IEstablishedConnectionClientData): void {
        this.connectedResolver = new ConnectedRunnerResolverClient({
            connectionChannel: establishedConnectionData.connectionChannel,
            connectionStrategy: establishedConnectionData.strategy,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            errorSerializer: this.errorSerializer,
            argumentSerializer: this.getOrCreateSerializerByConnectionStrategy(establishedConnectionData.strategy),
        });
        this.connectedResolver.run();
    }
}
