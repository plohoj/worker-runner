import { WorkerRunnerErrorSerializer } from "../../errors/error.serializer";
import { AnyRunnerFromList, RunnerIdentifierConfigList, RunnerToken } from "../../types/runner-identifier";
import { RunnerIdentifierConfigCollection } from "../runner-identifier-config.collection";
import { IRunnerControllerConfig, RunnerController, RunnerControllerPartFactory } from "./runner.controller";

export interface IRunnerControllerCollectionConfig<L extends RunnerIdentifierConfigList> {
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    errorSerializer: WorkerRunnerErrorSerializer,
}

export class RunnerControllerCollection<L extends RunnerIdentifierConfigList> {

    public readonly runnerControllerPartFactory: RunnerControllerPartFactory<AnyRunnerFromList<L>>
        = this.initRunnerControllerByPartConfigAndAttachToList.bind(this);
    public readonly runnerControllers = new Set<RunnerController<AnyRunnerFromList<L>>>();

    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    private readonly errorSerializer: WorkerRunnerErrorSerializer;

    constructor(config: IRunnerControllerCollectionConfig<L>) {
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.errorSerializer = config.errorSerializer;
    }

    public add(runnerController: RunnerController<AnyRunnerFromList<L>>): void {
        this.runnerControllers.add(runnerController);
    }
    
    public buildRunnerControllerByPartConfig(config: {
        token: RunnerToken,
        port: MessagePort,
    }): RunnerController<AnyRunnerFromList<L>> {
        const runnerController: RunnerController<AnyRunnerFromList<L>> = this.buildRunnerController({
            ...config,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            runnerControllerPartFactory: this.runnerControllerPartFactory,
            errorSerializer: this.errorSerializer,
            onDestroyed: () => this.runnerControllers.delete(runnerController),
        });
        return runnerController;
    }

    public async initRunnerControllerByPartConfigAndAttachToList(config: {
        token: RunnerToken,
        port: MessagePort,
    }): Promise<RunnerController<AnyRunnerFromList<L>>> {
        const runnerController = this.buildRunnerControllerByPartConfig(config);
        await runnerController.initAsync();
        this.runnerControllers.add(runnerController);
        return runnerController;
    }
    
    protected buildRunnerController(
        config: IRunnerControllerConfig<AnyRunnerFromList<L>>
    ): RunnerController<AnyRunnerFromList<L>> {
        return new RunnerController(config);
    }
}
