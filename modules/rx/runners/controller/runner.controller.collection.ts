import { AnyRunnerFromList, IRunnerControllerConfig, RunnerController, RunnerControllerCollection, RunnerIdentifierConfigList } from "@worker-runner/core";
import { RxRunnerController } from "./runner.controller";

export class RxRunnerControllerCollection<L extends RunnerIdentifierConfigList> extends RunnerControllerCollection<L> {
    
    protected override buildRunnerController(
        config: IRunnerControllerConfig<AnyRunnerFromList<L>>
    ): RunnerController<AnyRunnerFromList<L>> {
        return new RxRunnerController(config);
    }
}
