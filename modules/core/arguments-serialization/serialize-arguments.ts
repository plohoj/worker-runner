import { RunnerBridge, RUNNER_BRIDGE_CONTROLLER } from "../runner/runner-bridge/runner.bridge";
import { IRunnerParameter, IRunnerSerializedParameter } from "../types/constructor";
import { JsonObject } from "../types/json-object";
import { IRunnerSerializedArgument, RunnerSerializedArgumentType } from "../types/runner-serialized-argument";
import { TransferRunnerData } from "../utils/transfer-runner-data";

export async function serializeArguments(
    args: IRunnerParameter[],
): Promise<{
    arguments: IRunnerSerializedArgument[]
    transfer: Transferable[],
}> {
    const transfer = new Array<Transferable>();
    const serializedArguments = await Promise.all(
        args.map(async (argumentWithTransferData): Promise<IRunnerSerializedArgument> => {
            let argument: IRunnerSerializedParameter;
            if (argumentWithTransferData instanceof TransferRunnerData) {
                transfer.push(...argumentWithTransferData.transfer);
                argument = argumentWithTransferData.data;
            } else {
                argument = argumentWithTransferData;
            }
            if (RunnerBridge.isRunnerBridge(argument)) {
                const controller = (argument as RunnerBridge)[RUNNER_BRIDGE_CONTROLLER];
                // TODO close all connection after throw error 
                const transferPort = await controller.resolveOrTransferControl();
                transfer.push(transferPort);
                return {
                    type: RunnerSerializedArgumentType.RUNNER_INSTANCE,
                    port: transferPort,
                    token: controller.token,
                };
            } else {
                return {
                    type: RunnerSerializedArgumentType.JSON,
                    data: argument as JsonObject,
                };
            }
        }),
    );
    return {arguments: serializedArguments, transfer};
}
