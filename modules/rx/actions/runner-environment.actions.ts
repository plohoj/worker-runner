import { IRunnerEnvironmentAction, JsonObject, RunnerEnvironmentAction, StackTraceError } from '@worker-runner/core';
import { RxRunnerErrorCode } from '../runners-errors';

export enum RxRunnerEnvironmentAction {
    RX_INIT = 100,
    RX_EMIT,
    RX_EMIT_WITH_RUNNER_RESULT,
    RX_ERROR,
    RX_COMPLETED,
}

export interface IRxRunnerEnvironmentInitAction {
    type: RxRunnerEnvironmentAction.RX_INIT;
    id: number;
}

export interface IRxRunnerEnvironmentEmitAction {
    type: RxRunnerEnvironmentAction.RX_EMIT;
    id: number;
    response: JsonObject;
}

export interface IRxRunnerEnvironmentEmitWithRunnerResultAction {
    type: RxRunnerEnvironmentAction.RX_EMIT_WITH_RUNNER_RESULT;
    id: number;
    port: MessagePort;
    runnerId: number;
}

export type IRxRunnerEnvironmentErrorAction = StackTraceError<{
    type: RxRunnerEnvironmentAction.RX_ERROR;
    id: number;
    errorCode: RxRunnerErrorCode;
}>;

export interface IRxRunnerEnvironmentCompletedAction {
    type: RxRunnerEnvironmentAction.RX_COMPLETED;
    id: number;
}

export type IRxRunnerEnvironmentAction<T extends RunnerEnvironmentAction | RxRunnerEnvironmentAction
    = RunnerEnvironmentAction | RxRunnerEnvironmentAction>
        = T extends RunnerEnvironmentAction ? IRunnerEnvironmentAction<T> : Extract<
            IRxRunnerEnvironmentInitAction | IRxRunnerEnvironmentEmitAction
                | IRxRunnerEnvironmentErrorAction | IRxRunnerEnvironmentCompletedAction
                | IRxRunnerEnvironmentEmitWithRunnerResultAction,
            {type: T}
        >;
