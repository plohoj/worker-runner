import { JsonObject } from './json-object';

export enum RunnerArgumentType {
    JSON,
    RUNNER_INSTANCE,
}

export interface IRunnerJSONArgument {
    type: RunnerArgumentType.JSON;
    data: JsonObject;
}

export interface IRunnerInstanceArgument {
    type: RunnerArgumentType.RUNNER_INSTANCE;
    instanceId: number;
}

export type IRunnerArgument = IRunnerJSONArgument | IRunnerInstanceArgument;
