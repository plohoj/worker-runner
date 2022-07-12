import { BaseConnectionChannel } from '../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient, IAttachDataForSendRunner } from '../connection-strategies/base/base.connection-strategy-client';
import { WorkerRunnerMultipleError } from "../errors/worker-runner-error";
import { RunnerController, RUNNER_ENVIRONMENT_CLIENT } from "../runner/runner.controller";
import { IRunnerParameter, IRunnerSerializedParameter } from "../types/constructor";
import { JsonLike } from "../types/json-like";
import { IRunnerSerializedArgument, IRunnerSerializedRunnerArgument, RunnerSerializedArgumentTypeEnum } from "../types/runner-serialized-argument";
import { allPromisesCollectErrors, mapPromisesAndAwaitMappedWhenError } from "../utils/all-promises-collect-errors";
import { TransferRunnerData } from "../utils/transfer-runner-data";

export interface IArgumentsSerializerConfig {
    connectionStrategy: BaseConnectionStrategyClient;
}

export interface ISerializedArgumentsData {
    arguments: IRunnerSerializedArgument[];
    transfer: Transferable[];
}

export class ArgumentsSerializer {

    private readonly connectionStrategy: BaseConnectionStrategyClient;

    constructor(config: IArgumentsSerializerConfig) {
        this.connectionStrategy = config.connectionStrategy;
    }

    public async serializeArguments(config: {
        arguments: IRunnerParameter[],
        currentChannel: BaseConnectionChannel,
        combinedErrorsFactory(errors: unknown[]): WorkerRunnerMultipleError,
    }): Promise<ISerializedArgumentsData> {
        const transfer = new Array<Transferable>();
        const attachedDataList = new Array<IAttachDataForSendRunner>();
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
                    const environment = argument[RUNNER_ENVIRONMENT_CLIENT];
                    const serializedRunnerArgument: IRunnerSerializedRunnerArgument = {
                        type: RunnerSerializedArgumentTypeEnum.RUNNER,
                        token: environment.token,
                    };
                    const prepareData = await this.connectionStrategy.prepareRunnerForSend(
                        config.currentChannel,
                        environment,
                    )
                    Object.assign(serializedRunnerArgument, prepareData.attachData);
                    if (prepareData.transfer) {
                        transfer.push(...prepareData.transfer);
                    }
                    attachedDataList.push(prepareData.attachData);
                    return serializedRunnerArgument;
                } else {
                    return {
                        type: RunnerSerializedArgumentTypeEnum.JSON,
                        data: argument as JsonLike,
                    };
                }
            }
        );

        if (serializedArgumentsWithPossibleErrors.errors.length > 0) {
            const allErrors = new Array<unknown>();
            allErrors.push(...serializedArgumentsWithPossibleErrors.errors);
            const disconnectedOrErrors = await allPromisesCollectErrors([
                ...serializedArgumentsWithPossibleErrors.rest
                    .filter(restArgument => {
                        if (RunnerController.isRunnerController(restArgument)) {
                            const environment = restArgument[RUNNER_ENVIRONMENT_CLIENT];
                            return environment.isMarkedForTransfer;
                        }
                        return false
                    })
                    .map(controller => (controller as RunnerController)[RUNNER_ENVIRONMENT_CLIENT].disconnect()),
                ...attachedDataList
                    .map(async attachedData => {
                        await this.connectionStrategy.cancelSendAttachRunnerData(attachedData);
                    }),
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
}
