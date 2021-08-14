import { TransferableJsonObject } from './json-object';
import { RunnerToken } from "./runner-identifier";

export enum RunnerSerializedArgumentType {
    JSON = 'JSON',
    RUNNER_INSTANCE = 'RUNNER_INSTANCE',
}

export type IRunnerSerializedJSONArgument = {
    type: RunnerSerializedArgumentType.JSON;
    data: TransferableJsonObject;
}

export type IRunnerSerializedEnvironmentArgument = {
    type: RunnerSerializedArgumentType.RUNNER_INSTANCE;
    port: MessagePort;
    token: RunnerToken;
}

export type IRunnerSerializedArgument = IRunnerSerializedJSONArgument | IRunnerSerializedEnvironmentArgument;
