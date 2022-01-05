import { AnyRunnerFromList, IRunnerEnvironmentClientConfig, RunnerEnvironmentClient, RunnerEnvironmentClientCollection, RunnerIdentifierConfigList } from "@worker-runner/core";
import { RxRunnerEnvironmentClient } from "./runner-environment.client";

export class RxRunnerEnvironmentClientCollection<L extends RunnerIdentifierConfigList> extends RunnerEnvironmentClientCollection<L> {
    
    protected override buildRunnerEnvironmentClient(
        config: IRunnerEnvironmentClientConfig<AnyRunnerFromList<L>>
    ): RunnerEnvironmentClient<AnyRunnerFromList<L>> {
        return new RxRunnerEnvironmentClient(config);
    }
}
