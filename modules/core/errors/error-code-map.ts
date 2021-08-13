import { Constructor } from '../types/constructor';
import { WorkerRunnerErrorCode } from './error-code';
import { RunnerDestroyError, RunnerExecuteError, RunnerNotFound, ConnectionWasClosedError, HostResolverDestroyError, RunnerInitError } from './runner-errors';
import { IWorkerRunnerMultipleErrorConfig, WorkerRunnerError, WorkerRunnerUnexpectedError } from './worker-runner-error';

export type ICodeToErrorMap = Record<string, Constructor<WorkerRunnerError, [IWorkerRunnerMultipleErrorConfig]>>

export const CODE_TO_ERROR_MAP: ICodeToErrorMap = {
    [WorkerRunnerErrorCode.CONNECTION_WAS_CLOSED]: ConnectionWasClosedError,

    [WorkerRunnerErrorCode.RUNNER_INIT_ERROR]: RunnerInitError,
    [WorkerRunnerErrorCode.RUNNER_NOT_FOUND]: RunnerNotFound,
    [WorkerRunnerErrorCode.RUNNER_EXECUTE_ERROR]: RunnerExecuteError,
    [WorkerRunnerErrorCode.RUNNER_DESTROY_ERROR]: RunnerDestroyError,

    [WorkerRunnerErrorCode.HOST_DESTROY_ERROR]: HostResolverDestroyError,

    [WorkerRunnerErrorCode.UNEXPECTED_ERROR]: WorkerRunnerUnexpectedError,
};
