import { WorkerRunnerErrorSerializer } from "../../errors/error.serializer";
import { IRunnerControllerConfig, RunnerController } from "../../runner/controller/runner.controller";
import { RunnersListController } from "../../runner/runner-bridge/runners-list.controller";
import { IRunnerSerializedParameter } from "../../types/constructor";
import { AvailableRunnersFromList, RunnerToken, StrictRunnersList } from "../../types/runner-identifier";
import { IRunnerSerializedArgument, RunnerSerializedArgumentType } from "../../types/runner-serialized-argument";

export interface IArgumentsDeserializerConfig<L extends StrictRunnersList> {
    runnersListController: RunnersListController<L>;
    errorSerializer: WorkerRunnerErrorSerializer,
}

export class ArgumentsDeserializer<L extends StrictRunnersList> {

    private readonly errorSerializer: WorkerRunnerErrorSerializer;
    private readonly runnersListController: RunnersListController<L>;
    private readonly runnerControllerPartFactory = this.buildRunnerControllerByPartConfig.bind(this);

    constructor(config: Readonly<IArgumentsDeserializerConfig<L>>) {
        this.runnersListController = config.runnersListController;
        this.errorSerializer = config.errorSerializer;
    }

    public async deserializeArguments(config: {
        args: IRunnerSerializedArgument[],
        onRunnerControllerDestroyed: (runnerController: RunnerController<AvailableRunnersFromList<L>>) => void,
    }): Promise<{
        args: Array<IRunnerSerializedParameter>,
        controllers: Array<RunnerController<AvailableRunnersFromList<L>>>,
    }> {
        const result = {
            args: new Array<IRunnerSerializedParameter>(),
            controllers: new Array<RunnerController<AvailableRunnersFromList<L>>>(),
        };
        for (const argument of config.args) {
            switch (argument.type) {
                case RunnerSerializedArgumentType.RUNNER_INSTANCE: {
                    const controller = await this.buildRunnerControllerByPartConfig({
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

    protected buildRunnerControllerWithoutInit(
        config: IRunnerControllerConfig<AvailableRunnersFromList<L>>
    ): RunnerController<AvailableRunnersFromList<L>> {
        return new RunnerController(config);
    }

    private async buildRunnerControllerByPartConfig(config: {
        token: RunnerToken,
        port: MessagePort,
        onDestroyed: (runnerController: RunnerController<AvailableRunnersFromList<L>>) => void,
    }): Promise<RunnerController<AvailableRunnersFromList<L>>> {
        const runnerController = this.buildRunnerControllerWithoutInit({
            ...config,
            runnersListController: this.runnersListController,
            runnerControllerPartFactory: this.runnerControllerPartFactory,
            errorSerializer: this.errorSerializer,
        });
        await runnerController.init();
        return runnerController;
    }
}
