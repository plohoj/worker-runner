import { IRunnerControllerConfig, RunnerController } from "../../runner/controller/runner.controller";
import { RunnersListController } from "../../runner/runner-bridge/runners-list.controller";
import { IRunnerSerializedParameter } from "../../types/constructor";
import { AvailableRunnersFromList, RunnerToken, StrictRunnersList } from "../../types/runner-identifier";
import { IRunnerSerializedArgument, RunnerSerializedArgumentType } from "../../types/runner-serialized-argument";

export interface IArgumentsDeserializerConfig<L extends StrictRunnersList> {
    runnersListController: RunnersListController<L>;
}

export class ArgumentsDeserializer<L extends StrictRunnersList> {

    private readonly runnersListController: RunnersListController<L>;
    private readonly runnerControllerPartFactory = this.buildRunnerControllerByPartConfig.bind(this);

    constructor(config: Readonly<IArgumentsDeserializerConfig<L>>) {
        this.runnersListController = config.runnersListController;
    }

    public deserializeArguments(config: {
        args: IRunnerSerializedArgument[],
        onRunnerControllerDestroyed: (runnerController: RunnerController<AvailableRunnersFromList<L>>) => void,
    }): {
        args: Array<IRunnerSerializedParameter>,
        controllers: Array<RunnerController<AvailableRunnersFromList<L>>>,
    } {
        const result = {
            args: new Array<IRunnerSerializedParameter>(),
            controllers: new Array<RunnerController<AvailableRunnersFromList<L>>>(),
        };
        for (const argument of config.args) {
            switch (argument.type) {
                case RunnerSerializedArgumentType.RUNNER_INSTANCE: {
                    const controller = this.buildRunnerControllerByPartConfig({
                        port: argument.port,
                        token: argument.token,
                        onDestroyed: config.onRunnerControllerDestroyed,
                    });
                    result.controllers.push(controller);
                    result.args.push(controller.resolvedRunner);
                    break;
                }
                default:
                    result.args.push(argument.data);
            }
        }
        return result;
    }

    protected buildRunnerController(
        config: IRunnerControllerConfig<AvailableRunnersFromList<L>>
    ): RunnerController<AvailableRunnersFromList<L>> {
        return new RunnerController(config);
    }

    private buildRunnerControllerByPartConfig(config: {
        token: RunnerToken,
        port: MessagePort,
        onDestroyed: (runnerController: RunnerController<AvailableRunnersFromList<L>>) => void,
    }): RunnerController<AvailableRunnersFromList<L>> {

        const runnerBridgeConstructor = this.runnersListController.getRunnerBridgeConstructor(config.token);
        const originalRunnerName = this.runnersListController.getRunner(config.token).name;

        const runnerController = this.buildRunnerController({
            ...config,
            runnerBridgeConstructor,
            originalRunnerName,
            runnerControllerPartFactory: this.runnerControllerPartFactory,
        });
        return runnerController;
    }

}
