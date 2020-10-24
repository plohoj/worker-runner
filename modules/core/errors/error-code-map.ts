import { Constructor } from '../types/constructor';
import { WorkerRunnerErrorCode } from './error-code';
import { RunnerDestroyError, RunnerExecuteError, RunnerNotFound, ConnectionWasClosedError, WorkerDestroyError, RunnerInitError } from './runner-errors';
import { IWorkerRunnerErrorConfig, WorkerRunnerError, WorkerRunnerUnexpectedError } from './worker-runner-error';

export const CODE_TO_ERROR_MAP: Record<string, Constructor<WorkerRunnerError, [IWorkerRunnerErrorConfig]>> = {
    [WorkerRunnerErrorCode.CONNECTION_WAS_CLOSED]: ConnectionWasClosedError,

    [WorkerRunnerErrorCode.RUNNER_INIT_ERROR]: RunnerInitError,
    [WorkerRunnerErrorCode.RUNNER_NOT_FOUND]: RunnerNotFound,
    [WorkerRunnerErrorCode.RUNNER_EXECUTE_ERROR]: RunnerExecuteError,
    [WorkerRunnerErrorCode.RUNNER_DESTROY_ERROR]: RunnerDestroyError,

    [WorkerRunnerErrorCode.WORKER_DESTROY_ERROR]: WorkerDestroyError,

    [WorkerRunnerErrorCode.UNEXPECTED_ERROR]: WorkerRunnerUnexpectedError,
};
