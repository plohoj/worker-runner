import { ConnectController } from "../connect/controller/connect.controller";
import { WorkerRunnerMultipleError } from "../errors/worker-runner-error";
import { RunnerBridge, RUNNER_BRIDGE_CONTROLLER } from "../runner/runner.bridge";
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
            if (RunnerBridge.isRunnerBridge(argument)) {
                const controller = argument[RUNNER_BRIDGE_CONTROLLER];
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
                    if (RunnerBridge.isRunnerBridge(restArgument)) {
                        const controller = restArgument[RUNNER_BRIDGE_CONTROLLER];
                        return controller.isMarkedForTransfer;
                    }
                    return false
                })
                .map(bridge => (bridge as RunnerBridge)[RUNNER_BRIDGE_CONTROLLER].disconnect()),
            ...serializedArgumentsWithPossibleErrors.mapped
                .filter(serializeArgument => serializeArgument.type === RunnerSerializedArgumentType.RESOLVED_RUNNER)
                .map(runnerSerializedArgument =>
                    ConnectController.disconnectPort(
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
