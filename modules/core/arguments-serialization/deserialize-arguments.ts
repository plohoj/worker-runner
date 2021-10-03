import { ConnectClient } from "../connect/client/connect.client";
import { WorkerRunnerMultipleError } from "../errors/worker-runner-error";
import { RunnerController, RunnerControllerPartFactory } from "../runner/controller/runner.controller";
import { IRunnerSerializedParameter } from "../types/constructor";
import { AvailableRunnersFromList, RunnerIdentifierConfigList } from "../types/runner-identifier";
import { IRunnerSerializedArgument, RunnerSerializedArgumentType } from "../types/runner-serialized-argument";
import { allPromisesCollectErrors, mapPromisesAndAwaitMappedWhenError } from "../utils/all-promises-collect-errors";

export async function deserializeArguments<L extends RunnerIdentifierConfigList>(config: {
    arguments: IRunnerSerializedArgument[],
    runnerControllerPartFactory: RunnerControllerPartFactory<AvailableRunnersFromList<L>>;
    combinedErrorsFactory(errors: unknown[]): WorkerRunnerMultipleError,
}): Promise<{
    arguments: Array<IRunnerSerializedParameter>,
    controllers: Array<RunnerController<AvailableRunnersFromList<L>>>,
}> {
    const controllers = new Array<RunnerController<AvailableRunnersFromList<L>>>();
    const deserializedArgumentsWithPossibleErrors = await mapPromisesAndAwaitMappedWhenError(
        config.arguments,
        async (argument): Promise<IRunnerSerializedParameter> => {
            switch (argument.type) {
                case RunnerSerializedArgumentType.RESOLVED_RUNNER: {
                    let controller: RunnerController<AvailableRunnersFromList<L>>;
                    try {
                        controller = await config.runnerControllerPartFactory({
                            port: argument.port,
                            token: argument.token,
                        });
                    } catch (error: unknown) {
                        await ConnectClient.disconnectPort(argument.port);
                        throw error;
                    }
                    controllers.push(controller);
                    return controller.resolvedRunner;
                }
                default:
                    return argument.data;
            }
        },
    );
    
    if (deserializedArgumentsWithPossibleErrors.errors.length > 0) {
        const allErrors = new Array<unknown>();
        allErrors.push(...deserializedArgumentsWithPossibleErrors.errors);
        const disconnectedOrErrors =  await allPromisesCollectErrors([
            ...deserializedArgumentsWithPossibleErrors.rest.map(async restArgument => {
                if (restArgument.type === RunnerSerializedArgumentType.RESOLVED_RUNNER) {
                    await ConnectClient.disconnectPort(restArgument.port);
                }
            }),
            ...controllers.map(controller => controller.disconnect()),
        ]);
        if ('errors' in disconnectedOrErrors) {
            allErrors.push(...disconnectedOrErrors.errors);
        }
        // TODO NEED TEST
        throw config.combinedErrorsFactory(allErrors);
    }

    return {
        arguments: deserializedArgumentsWithPossibleErrors.mapped,
        controllers,
    };
}
