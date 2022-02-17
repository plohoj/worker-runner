import { TransferableJsonLike } from './json-like';
import { RunnerToken } from "./runner-identifier";

export enum RunnerSerializedArgumentType {
    JSON = 'JSON',
    RESOLVED_RUNNER = 'RESOLVED_RUNNER',
}

export type IRunnerSerializedJSONArgument = {
    type: RunnerSerializedArgumentType.JSON;
    data: TransferableJsonLike;
}

export type IRunnerSerializedResolvedRunnerArgument = {
    type: RunnerSerializedArgumentType.RESOLVED_RUNNER;
    port: MessagePort;
    token: RunnerToken;
}

export type IRunnerSerializedArgument = IRunnerSerializedJSONArgument | IRunnerSerializedResolvedRunnerArgument;
