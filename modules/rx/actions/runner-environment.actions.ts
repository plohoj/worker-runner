import { IRunnerEnvironmentAction, JsonObject, RunnerEnvironmentAction, StackTraceError } from '@worker-runner/core';
import { RxRunnerErrorCode } from '../runners-errors';

export enum RxRunnerEnvironmentAction {
    RUNNER_RX_INIT = 100,
    RUNNER_RX_EMIT,
    RUNNER_RX_ERROR,
    RUNNER_RX_COMPLETED,
}

export interface IRxRunnerEnvironmentInitAction {
    type: RxRunnerEnvironmentAction.RUNNER_RX_INIT;
    id: number;
}

export interface IRxRunnerEnvironmentEmitAction {
    type: RxRunnerEnvironmentAction.RUNNER_RX_EMIT;
    id: number;
    response: JsonObject;
}

export type IRxRunnerEnvironmentErrorAction = StackTraceError<{
    type: RxRunnerEnvironmentAction.RUNNER_RX_ERROR;
    id: number;
    errorCode: RxRunnerErrorCode;
}>;

export interface IRxRunnerEnvironmentCompletedAction {
    type: RxRunnerEnvironmentAction.RUNNER_RX_COMPLETED;
    id: number;
}

export type IRxRunnerEnvironmentAction<T extends RunnerEnvironmentAction | RxRunnerEnvironmentAction
    = RunnerEnvironmentAction | RxRunnerEnvironmentAction>
        = T extends RunnerEnvironmentAction ? IRunnerEnvironmentAction<T> : Extract<
            IRxRunnerEnvironmentInitAction | IRxRunnerEnvironmentEmitAction
                | IRxRunnerEnvironmentErrorAction | IRxRunnerEnvironmentCompletedAction,
            {type: T}
        >;
