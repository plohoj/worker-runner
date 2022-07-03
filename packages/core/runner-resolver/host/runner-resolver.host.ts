import { ArgumentsDeserializer } from '../../arguments-serialization/arguments-deserializer';
import { ArgumentsSerializer } from '../../arguments-serialization/arguments-serializer';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { BaseConnectionHost, IEstablishedConnectionHostData } from '../../connections/base/base.connection-host';
import { WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RunnerResolverHostDestroyError } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { RunnerEnvironmentHost } from '../../runner-environment/host/runner-environment.host';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { IArgumentSerialization } from '../../types/argument-serialization.interface';
import { AvailableRunnersFromList, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { allPromisesCollectErrors } from '../../utils/all-promises-collect-errors';
import { ConnectedRunnerResolverHost } from './connected-runner-resolver.host';

export type IRunnerResolverHostConfigBase<L extends RunnerIdentifierConfigList> = {
    connection: BaseConnectionHost;
} & ({
    runners: L
} | {
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>}
);

export abstract class RunnerResolverHostBase<L extends RunnerIdentifierConfigList> {
    
    protected readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    protected readonly errorSerializer = WORKER_RUNNER_ERROR_SERIALIZER;

    private readonly runnerEnvironmentHosts = new Set<RunnerEnvironmentHost<AvailableRunnersFromList<L>>>();
    private readonly connection: BaseConnectionHost;
    private readonly connectedResolvers = new Set<ConnectedRunnerResolverHost>();
    private readonly argumentSerializationByStrategyMap
         = new Map<BaseConnectionStrategyHost, IArgumentSerialization>();

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
            [...this.runnerEnvironmentHosts]
                .map(runnerEnvironmentHost => runnerEnvironmentHost.handleDestroy())
        )
        if ('errors' in possibleErrors) {
            throw new RunnerResolverHostDestroyError({ 
                originalErrors: possibleErrors.errors,
            });
        }
    }

    public wrapRunner(runnerInstance: InstanceType<AvailableRunnersFromList<L>>): MessagePort {
        // const messageChannel = new MessageChannel();

        // const runnerEnvironmentHost = this.buildRunnerEnvironmentHostByPartConfig({
        //     token: this.runnerIdentifierConfigCollection.getRunnerTokenByInstance(runnerInstance),
        //     connectionChannel,
        // });
        // runnerEnvironmentHost.initSync({ runnerInstance });

        // this.runnerEnvironmentHosts.add(runnerEnvironmentHost);
        // return messageChannel.port2;

        throw new WorkerRunnerUnexpectedError({message: 'Method wrapRunner not implemented'});
    }

    private newConnectionHandler = (newConnectionData: IEstablishedConnectionHostData) => {
        const serialization = this.getOrCreateSerializationByConnectionStrategy(newConnectionData.strategy);

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
        strategy: BaseConnectionStrategyHost
    ): IArgumentSerialization {
        let serialization = this.argumentSerializationByStrategyMap.get(strategy);
        if (!serialization) {
            serialization = {
                serializer: new ArgumentsSerializer({
                    connectionStrategy: strategy.strategyClient,
                }),
                deserializer: new ArgumentsDeserializer({
                    connectionStrategy: strategy,
                }),
            };
            this.argumentSerializationByStrategyMap.set(strategy, serialization);
        }
        return serialization;
    }

}
