import { TransferableJsonLike } from './json-like';
import { RunnerToken } from "./runner-identifier";

export enum RunnerSerializedArgumentTypeEnum {
    JSON = 'JSON',
    RUNNER = 'RUNNER',
}

export type IRunnerSerializedJsonArgument = {
    type: RunnerSerializedArgumentTypeEnum.JSON;
    data: TransferableJsonLike;
}

export type IRunnerSerializedRunnerArgument = {
    type: RunnerSerializedArgumentTypeEnum.RUNNER;
    token: RunnerToken;
}

export type IRunnerSerializedArgument = IRunnerSerializedJsonArgument | IRunnerSerializedRunnerArgument;
