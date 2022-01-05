import { WorkerRunnerErrorSerializer } from "../../errors/error.serializer";
import { RunnerIdentifierConfigCollection } from "../../runner/runner-identifier-config.collection";
import { AnyRunnerFromList, RunnerIdentifierConfigList, RunnerToken } from "../../types/runner-identifier";
import { IRunnerEnvironmentClientConfig, RunnerEnvironmentClient, RunnerEnvironmentClientPartFactory } from "./runner-environment.client";

export interface IRunnerEnvironmentClientCollectionConfig<L extends RunnerIdentifierConfigList> {
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    errorSerializer: WorkerRunnerErrorSerializer,
}

export class RunnerEnvironmentClientCollection<L extends RunnerIdentifierConfigList> {

    public readonly runnerEnvironmentClientPartFactory: RunnerEnvironmentClientPartFactory<AnyRunnerFromList<L>>
        = this.initRunnerEnvironmentClientByPartConfigAndAttachToList.bind(this);
    public readonly runnerEnvironmentClients = new Set<RunnerEnvironmentClient<AnyRunnerFromList<L>>>();

    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    private readonly errorSerializer: WorkerRunnerErrorSerializer;

    constructor(config: IRunnerEnvironmentClientCollectionConfig<L>) {
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.errorSerializer = config.errorSerializer;
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
    
    public buildRunnerEnvironmentClientByPartConfig(config: {
        token: RunnerToken,
        port: MessagePort,
    }): RunnerEnvironmentClient<AnyRunnerFromList<L>> {
        const runnerEnvironmentClient: RunnerEnvironmentClient<AnyRunnerFromList<L>> = this.buildRunnerEnvironmentClient({
            ...config,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            runnerEnvironmentClientPartFactory: this.runnerEnvironmentClientPartFactory,
            errorSerializer: this.errorSerializer,
            onDestroyed: () => this.runnerEnvironmentClients.delete(runnerEnvironmentClient),
        });
        return runnerEnvironmentClient;
    }

    public async initRunnerEnvironmentClientByPartConfigAndAttachToList(config: {
        token: RunnerToken,
        port: MessagePort,
    }): Promise<RunnerEnvironmentClient<AnyRunnerFromList<L>>> {
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
