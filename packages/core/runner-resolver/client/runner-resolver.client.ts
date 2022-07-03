import { ArgumentsSerializer } from '../../arguments-serialization/arguments-serializer';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { BaseConnectionClient } from '../../connections/base/base.connection-client';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { ConnectionWasClosedError } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { RunnerController } from '../../runner/runner.controller';
import { IRunnerParameter } from '../../types/constructor';
import { AvailableRunnerIdentifier, AvailableRunnersFromList, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { ConnectedRunnerResolverClient } from './connected-runner-resolver.client';

export type IRunnerResolverClientBaseConfig<L extends RunnerIdentifierConfigList> = {
    connection: BaseConnectionClient
    runners?: L;
};

export class RunnerResolverClientBase<L extends RunnerIdentifierConfigList>  {
    
    protected readonly errorSerializer: ErrorSerializer = this.buildErrorSerializer();
    protected readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;

    private readonly connection: BaseConnectionClient;
    private readonly argumentSerializerByStrategyMap
        = new Map<BaseConnectionStrategyClient, ArgumentsSerializer>();

    private connectedResolver?: ConnectedRunnerResolverClient;

    constructor(config: IRunnerResolverClientBaseConfig<L>) {
        this.runnerIdentifierConfigCollection = new RunnerIdentifierConfigCollection({
            runners: config.runners || [],
        });
        this.connection = config.connection;
    }

    /** Launches and prepares RunnerResolver for work */
    public async run(): Promise<void> {
        const establishedConnectionData  = await this.connection.connect();
        this.connectedResolver = new ConnectedRunnerResolverClient({
            connectionChannel: establishedConnectionData.connectionChannel,
            connectionStrategy: establishedConnectionData.strategy,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            errorSerializer: this.errorSerializer,
            argumentSerializer: this.getOrCreateSerializerByConnectionStrategy(establishedConnectionData.strategy),
        });
        this.connectedResolver.run();
    }

    /** Returns a runner control object that will call the methods of the source instance */
    public resolve(identifier: AvailableRunnerIdentifier<L>, ...args: IRunnerParameter[]): Promise<RunnerController> {
        if (!this.connectedResolver) { // TODO Check connection validation everywhere
            throw new ConnectionWasClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
            });
        }
        return this.connectedResolver.resolve(identifier, ...args);
    }

    /** Destroying of all resolved Runners instance */
    public destroy(): Promise<void> {
        if (!this.connectedResolver) {
            throw new ConnectionWasClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
            });
        }
        return this.connectedResolver.destroy();
    }

    protected buildErrorSerializer(): ErrorSerializer {
        return WORKER_RUNNER_ERROR_SERIALIZER;
    }

    // TODO Need to implement the configuration token after adding constructing resolver/
    /**
     * Wraps the Runner and returns a Runner control object that will call the methods of the original Runner instance.
     * The original Runner instance will be executed in the same area in which it was wrapped.
     */
    protected wrapRunner(runnerInstance: InstanceType<AvailableRunnersFromList<L>>): RunnerController {
        // if (!this.resolverBridge) {
        //     throw new ConnectionWasClosedError({
        //         message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
        //     });
        // }
        // const runnerConstructor: AvailableRunnersFromList<L> = Object.getPrototypeOf(runnerInstance).constructor;
        // let token = this.runnerIdentifierConfigCollection.getRunnerTokenSoft(runnerConstructor);
        // if (!token) {
        //     token = this.runnerIdentifierConfigCollection.generateTokenNameByRunnerConstructor(runnerConstructor);
        //     this.runnerIdentifierConfigCollection.defineRunnerConstructor(token, runnerConstructor);
        // }
        // const runnerControllerConstructor = this.runnerIdentifierConfigCollection.getRunnerControllerConstructor(token);
        // const port = (this.resolverBridge as RunnerResolverBridgeLocal<RunnerIdentifierConfigList>)
        //     .runnerResolverHost.wrapRunner(runnerInstance);
        // const runnerEnvironmentClient = this.runnerEnvironmentClientCollection.buildRunnerEnvironmentClientByPartConfig({
        //     token,
        //     port,
        // });
        // this.runnerEnvironmentClientCollection.add(runnerEnvironmentClient);
        // runnerEnvironmentClient.initSync({ runnerControllerConstructor });

        // return runnerEnvironmentClient.resolvedRunner;

        throw new WorkerRunnerUnexpectedError({message: 'Method wrapRunner not implemented'});
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
}
