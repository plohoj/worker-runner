import { ArgumentsDeserializer } from '../../arguments-serialization/arguments-deserializer';
import { ArgumentsSerializer } from '../../arguments-serialization/arguments-serializer';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { BaseConnectionHost, IEstablishedConnectionHostData } from '../../connections/base/base.connection-host';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { ConnectionClosedError, RunnerResolverHostDestroyError } from '../../errors/runner-errors';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { IArgumentSerialization } from '../../types/argument-serialization.interface';
import { RunnerConstructor } from '../../types/constructor';
import { AvailableRunnersFromList, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { allPromisesCollectErrors } from '../../utils/all-promises-collect-errors';
import { ConnectedRunnerResolverHost } from './connected-runner-resolver.host';

export type IRunnerResolverHostConfigBase<L extends RunnerIdentifierConfigList> = {
    connection: BaseConnectionHost;
} & ({
    runners: L
} | {
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>
});

export abstract class RunnerResolverHostBase<L extends RunnerIdentifierConfigList> {
    
    protected readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    protected readonly errorSerializer = WORKER_RUNNER_ERROR_SERIALIZER;

    private readonly connection: BaseConnectionHost;
    private readonly connectedResolvers = new Set<ConnectedRunnerResolverHost>();
    private readonly argumentSerializationByStrategyMap
         = new Map<BaseConnectionStrategyClient, IArgumentSerialization>();

    constructor(config: IRunnerResolverHostConfigBase<L>) {
        this.runnerIdentifierConfigCollection = 'runners' in config
            ? new RunnerIdentifierConfigCollection({ runners: config.runners })
            : config.runnerIdentifierConfigCollection;
        this.connection = config.connection;
    }

    public run(): void {
        this.connection.startListen(this.newConnectionHandler);
    }

    public async destroy(): Promise<void> {
        const possibleErrors = await allPromisesCollectErrors(
            [...this.connectedResolvers]
                .map(connectedResolver => connectedResolver.handleDestroy())
        )
        await this.connection.stop?.();
        if ('errors' in possibleErrors) {
            throw new RunnerResolverHostDestroyError({ 
                originalErrors: possibleErrors.errors,
            });
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
        const serialization = this.getOrCreateSerializationByConnectionStrategy(
            newConnectionData.strategy.strategyClient
        );

        const connectedResolver: ConnectedRunnerResolverHost = new ConnectedRunnerResolverHost({
            connectionChannel: newConnectionData.connectionChannel,
            connectionStrategy: newConnectionData.strategy,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            errorSerializer: this.errorSerializer,
            argumentSerializer: serialization.serializer,
            argumentDeserializer: serialization.deserializer,
            onDestroy: () => this.connectedResolvers.delete(connectedResolver),
        });
        connectedResolver.run();

        this.connectedResolvers.add(connectedResolver);
    }
    
    private getOrCreateSerializationByConnectionStrategy(
        strategy: BaseConnectionStrategyClient
    ): IArgumentSerialization {
        let serialization = this.argumentSerializationByStrategyMap.get(strategy);
        if (!serialization) {
            serialization = {
                serializer: new ArgumentsSerializer({connectionStrategy: strategy}),
                deserializer: new ArgumentsDeserializer({connectionStrategy: strategy}),
            };
            this.argumentSerializationByStrategyMap.set(strategy, serialization);
        }
        return serialization;
    }

}
