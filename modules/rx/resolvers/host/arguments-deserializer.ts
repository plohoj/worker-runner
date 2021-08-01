import { ArgumentsDeserializer, AvailableRunnersFromList, IRunnerControllerConfig, RunnerController, StrictRunnersList } from "@worker-runner/core";
import { RxRunnerController } from "../../runners/controller/runner.controller";

export class RxArgumentsDeserializer<L extends StrictRunnersList> extends ArgumentsDeserializer<L> {
    protected override buildRunnerControllerWithoutInit(
        config: IRunnerControllerConfig<AvailableRunnersFromList<L>>
    ): RunnerController<AvailableRunnersFromList<L>> {
        return new RxRunnerController(config);
    }
}
