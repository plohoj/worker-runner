import { JsonObject } from './json-object';
import { RunnerToken } from "./runner-token";

export enum RunnerArgumentType {
    JSON = 'JSON',
    RUNNER_INSTANCE = 'RUNNER_INSTANCE',
}

export interface IRunnerJSONArgument {
    type: RunnerArgumentType.JSON;
    data: JsonObject;
}

export interface IRunnerEnvironmentArgument {
    type: RunnerArgumentType.RUNNER_INSTANCE;
    port: MessagePort;
    token: RunnerToken;
}

export type IRunnerArgument = IRunnerJSONArgument | IRunnerEnvironmentArgument;
