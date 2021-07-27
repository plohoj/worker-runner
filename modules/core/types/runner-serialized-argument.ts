import { JsonObject } from './json-object';
import { RunnerToken } from "./runner-identifier";

export enum RunnerSerializedArgumentType {
    JSON = 'JSON',
    RUNNER_INSTANCE = 'RUNNER_INSTANCE',
}

export interface IRunnerSerializedJSONArgument {
    type: RunnerSerializedArgumentType.JSON;
    data: JsonObject;
}

export interface IRunnerSerializedEnvironmentArgument {
    type: RunnerSerializedArgumentType.RUNNER_INSTANCE;
    port: MessagePort;
    token: RunnerToken;
}

export type IRunnerSerializedArgument = IRunnerSerializedJSONArgument | IRunnerSerializedEnvironmentArgument;
