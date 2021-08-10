import { RunnerController, RunnerControllerPartFactory } from "../runner/controller/runner.controller";
import { IRunnerSerializedParameter } from "../types/constructor";
import { AvailableRunnersFromList, StrictRunnersList } from "../types/runner-identifier";
import { IRunnerSerializedArgument, RunnerSerializedArgumentType } from "../types/runner-serialized-argument";

export async function deserializeArguments<L extends StrictRunnersList>(config: {
    arguments: IRunnerSerializedArgument[],
    runnerControllerPartFactory: RunnerControllerPartFactory<AvailableRunnersFromList<L>>;
}): Promise<{
    arguments: Array<IRunnerSerializedParameter>,
    controllers: Array<RunnerController<AvailableRunnersFromList<L>>>,
}> {
    const controllers = new Array<RunnerController<AvailableRunnersFromList<L>>>();
    const args = await Promise.all(
        config.arguments.map(async (argument): Promise<IRunnerSerializedParameter> => {
            switch (argument.type) {
                case RunnerSerializedArgumentType.RUNNER_INSTANCE: {
                    const controller = await config.runnerControllerPartFactory({
                        port: argument.port,
                        token: argument.token,
                    });
                    controllers.push(controller);
                    return controller.resolvedRunner;
                }
                default:
                    return argument.data;
            }
        }),
    ); // TODO Disconnect all connections if has error
    return { arguments: args, controllers };
}
