import { ConnectClient } from "../connect/client/connect.client";
import { WorkerRunnerMultipleError } from "../errors/worker-runner-error";
import { RunnerController, RUNNER_ENVIRONMENT_CLIENT } from "../runner/runner.controller";
import { IRunnerParameter, IRunnerSerializedParameter } from "../types/constructor";
import { JsonObject } from "../types/json-object";
import { IRunnerSerializedArgument, IRunnerSerializedResolvedRunnerArgument, RunnerSerializedArgumentType } from "../types/runner-serialized-argument";
import { allPromisesCollectErrors, mapPromisesAndAwaitMappedWhenError } from "../utils/all-promises-collect-errors";
import { TransferRunnerData } from "../utils/transfer-runner-data";

export async function serializeArguments(config: {
    arguments: IRunnerParameter[],
    combinedErrorsFactory(errors: unknown[]): WorkerRunnerMultipleError,
}): Promise<{
    arguments: IRunnerSerializedArgument[]
    transfer: Transferable[],
}> {
    const transfer = new Array<Transferable>();
    const serializedArgumentsWithPossibleErrors = await mapPromisesAndAwaitMappedWhenError(
        config.arguments,
        async (argumentWithTransferData): Promise<IRunnerSerializedArgument> => {
            let argument: IRunnerSerializedParameter;
            if (argumentWithTransferData instanceof TransferRunnerData) {
                transfer.push(...argumentWithTransferData.transfer);
                argument = argumentWithTransferData.data;
            } else {
                argument = argumentWithTransferData;
            }
            if (RunnerController.isRunnerController(argument)) {
                const controller = argument[RUNNER_ENVIRONMENT_CLIENT];
                const transferPort = await controller.resolveOrTransferControl();
                transfer.push(transferPort);
                return {
                    type: RunnerSerializedArgumentType.RESOLVED_RUNNER,
                    port: transferPort,
                    token: controller.token,
                };
            } else {
                return {
                    type: RunnerSerializedArgumentType.JSON,
                    data: argument as JsonObject,
                };
            }
        }
    );

    if (serializedArgumentsWithPossibleErrors.errors.length > 0) {
        const allErrors = new Array<unknown>();
        allErrors.push(...serializedArgumentsWithPossibleErrors.errors);
        const disconnectedOrErrors =  await allPromisesCollectErrors([
            ...serializedArgumentsWithPossibleErrors.rest
                .filter(restArgument => {
                    if (RunnerController.isRunnerController(restArgument)) {
                        const controller = restArgument[RUNNER_ENVIRONMENT_CLIENT];
                        return controller.isMarkedForTransfer;
                    }
                    return false
                })
                .map(controller => (controller as RunnerController)[RUNNER_ENVIRONMENT_CLIENT].disconnect()),
            ...serializedArgumentsWithPossibleErrors.mapped
                .filter(serializeArgument => serializeArgument.type === RunnerSerializedArgumentType.RESOLVED_RUNNER)
                .map(runnerSerializedArgument =>
                    ConnectClient.disconnectPort(
                        (runnerSerializedArgument as IRunnerSerializedResolvedRunnerArgument).port
                    ),
                ),
        ]);
        if ('errors' in disconnectedOrErrors) {
            // TODO NEED TEST
            allErrors.push(...disconnectedOrErrors.errors);
        }
        throw config.combinedErrorsFactory(allErrors);
    }

    return {
        arguments: serializedArgumentsWithPossibleErrors.mapped,
        transfer,
    };
}
