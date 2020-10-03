import { JsonObject } from './json-object';

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
    runnerId: number;
}

export type IRunnerArgument = IRunnerJSONArgument | IRunnerEnvironmentArgument;
