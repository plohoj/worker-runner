import { Constructor } from '../types/constructor';
import { WorkerRunnerErrorCode } from './error-code';
import { RunnerDestroyError, RunnerExecuteError, RunnerInitError, RunnerWasDisconnectedError, WorkerNotInitError } from './runner-errors';
import { IWorkerRunnerErrorConfig, WorkerRunnerError, WorkerRunnerUnexpectedError } from './worker-runner-error';

export const CODE_TO_ERROR_MAP: Record<number, Constructor<WorkerRunnerError, [IWorkerRunnerErrorConfig]>> = {
    [WorkerRunnerErrorCode.RUNNER_INIT_ERROR]: RunnerInitError,
    [WorkerRunnerErrorCode.RUNNER_EXECUTE_ERROR]: RunnerExecuteError,
    [WorkerRunnerErrorCode.RUNNER_DESTROY_ERROR]: RunnerDestroyError,
    [WorkerRunnerErrorCode.RUNNER_NOT_INIT]: RunnerWasDisconnectedError,
    [WorkerRunnerErrorCode.WORKER_NOT_INIT]: WorkerNotInitError,
    [WorkerRunnerErrorCode.UNEXPECTED_ERROR]: WorkerRunnerUnexpectedError,
};
