import { ActionController } from '../../action-controller/action-controller';
import { ArgumentsSerializer } from '../../arguments-serialization/arguments-serializer';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ErrorSerializer } from "../../errors/error.serializer";
import { ConnectionWasClosedError } from '../../errors/runner-errors';
import { RunnerIdentifierConfigCollection } from "../../runner/runner-identifier-config.collection";
import { DisconnectErrorFactory } from '../../types/disconnect-error-factory';
import { AnyRunnerFromList, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { IRunnerEnvironmentClientConfig, IRunnerEnvironmentClientPartFactoryConfig, RunnerEnvironmentClient, RunnerEnvironmentClientPartFactory } from "./runner-environment.client";

export interface IRunnerEnvironmentClientCollectionConfig<L extends RunnerIdentifierConfigList> {
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    connectionStrategy: BaseConnectionStrategyClient,
    errorSerializer: ErrorSerializer,
    argumentSerializer: ArgumentsSerializer;
}

export class RunnerEnvironmentClientCollection<L extends RunnerIdentifierConfigList> {

    public readonly runnerEnvironmentClientPartFactory: RunnerEnvironmentClientPartFactory<AnyRunnerFromList<L>>
        = this.initRunnerEnvironmentClientByPartConfigAndAttachToList.bind(this);
    public readonly runnerEnvironmentClients = new Set<RunnerEnvironmentClient<AnyRunnerFromList<L>>>();

    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    private readonly connectionStrategy: BaseConnectionStrategyClient;
    private readonly errorSerializer: ErrorSerializer;
    private readonly argumentSerializer: ArgumentsSerializer;

    constructor(config: IRunnerEnvironmentClientCollectionConfig<L>) {
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.connectionStrategy = config.connectionStrategy;
        this.errorSerializer = config.errorSerializer;
        this.argumentSerializer = config.argumentSerializer;
    }

    public add(...runnerEnvironmentClients: RunnerEnvironmentClient<AnyRunnerFromList<L>>[]): void {
        for (const runnerEnvironmentClient of runnerEnvironmentClients) {
            this.runnerEnvironmentClients.add(runnerEnvironmentClient);
        }
    }

    public delete(...runnerEnvironmentClients: RunnerEnvironmentClient<AnyRunnerFromList<L>>[]): void {
        for (const runnerEnvironmentClient of runnerEnvironmentClients) {
            this.runnerEnvironmentClients.delete(runnerEnvironmentClient);
        }
    }
    
    public buildRunnerEnvironmentClientByPartConfig(
        config: IRunnerEnvironmentClientPartFactoryConfig
    ): RunnerEnvironmentClient<AnyRunnerFromList<L>> {
        const disconnectErrorFactory: DisconnectErrorFactory = (error: ConnectionWasClosedError): ConnectionWasClosedError => 
            new ConnectionWasClosedError({
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
        const runnerEnvironmentClient: RunnerEnvironmentClient<AnyRunnerFromList<L>> = this.buildRunnerEnvironmentClient({
            token: config.token,
            actionController,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            connectionStrategy: this.connectionStrategy,
            errorSerializer: this.errorSerializer,
            argumentSerializer: this.argumentSerializer,
            disconnectErrorFactory,
            runnerEnvironmentClientPartFactory: this.runnerEnvironmentClientPartFactory,
            onDestroyed: () => this.runnerEnvironmentClients.delete(runnerEnvironmentClient),
        });
        return runnerEnvironmentClient;
    }

    public async initRunnerEnvironmentClientByPartConfigAndAttachToList(
        config: IRunnerEnvironmentClientPartFactoryConfig
    ): Promise<RunnerEnvironmentClient<AnyRunnerFromList<L>>> {
        const EnvironmentClient = this.buildRunnerEnvironmentClientByPartConfig(config);
        await EnvironmentClient.initAsync();
        this.runnerEnvironmentClients.add(EnvironmentClient);
        return EnvironmentClient;
    }

    protected buildRunnerEnvironmentClient(
        config: IRunnerEnvironmentClientConfig<AnyRunnerFromList<L>>
    ): RunnerEnvironmentClient<AnyRunnerFromList<L>> {
        return new RunnerEnvironmentClient(config);
    }
}
