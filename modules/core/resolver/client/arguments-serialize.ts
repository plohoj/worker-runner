import { RunnerBridge, RUNNER_BRIDGE_CONTROLLER } from "../../runner/runner-bridge/runner.bridge";
import { IRunnerParameter, IRunnerSerializedParameter } from "../../types/constructor";
import { JsonObject } from "../../types/json-object";
import { IRunnerSerializedArgument, RunnerSerializedArgumentType } from "../../types/runner-serialized-argument";
import { TransferRunnerData } from "../../utils/transfer-runner-data";

export async function serializeArguments(
    args: IRunnerParameter[],
): Promise<{
    args: IRunnerSerializedArgument[]
    transfer: Transferable[],
}> {
    const serializedArguments = {
        args: new Array<IRunnerSerializedArgument>(),
        transfer: new Array<Transferable>(),
    };
    const argsMap = new Map<number, IRunnerSerializedArgument>();
    await Promise.all(args.map(async (argumentWithTransferData, index) => {
        let argument: IRunnerSerializedParameter;
        if (argumentWithTransferData instanceof TransferRunnerData) {
            serializedArguments.transfer.push(...argumentWithTransferData.transfer);
            argument = argumentWithTransferData.data;
        } else {
            argument = argumentWithTransferData;
        }
        if (RunnerBridge.isRunnerBridge(argument)) {
            const controller = (argument as RunnerBridge)[RUNNER_BRIDGE_CONTROLLER];
            // TODO close all connection after throw error 
            const transferPort = await controller.resolveOrTransferControl();
            argsMap.set(index, {
                type: RunnerSerializedArgumentType.RUNNER_INSTANCE,
                port: transferPort,
                token: controller.token,
            });
            serializedArguments.transfer.push(transferPort);
        } else {
            argsMap.set(index, {
                type: RunnerSerializedArgumentType.JSON,
                data: argument as JsonObject,
            });
        }
    }));
    for (let argumentIndex = 0; argumentIndex < args.length; argumentIndex++) {
        serializedArguments.args.push(argsMap.get(argumentIndex) as IRunnerSerializedArgument);
    }
    return serializedArguments;
}