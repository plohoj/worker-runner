import { WorkerRunnerCoreErrorCode } from './core-error-code';
import { RunnerDataTransferError, RunnerDestroyError, RunnerExecuteError, RunnerInitError, RunnerNotFound, RunnerResolverHostDestroyError } from './runner-errors';
import { WorkerRunnerErrorConstructor, WorkerRunnerUnexpectedError } from './worker-runner-error';

export type ICoreCodeToErrorMap = Record<string, WorkerRunnerErrorConstructor>

export const CORE_ERROR_CODE_MAP: ICoreCodeToErrorMap = {
    [WorkerRunnerCoreErrorCode.RUNNER_INIT_ERROR]: RunnerInitError,
    [WorkerRunnerCoreErrorCode.RUNNER_NOT_FOUND]: RunnerNotFound,
    [WorkerRunnerCoreErrorCode.RUNNER_EXECUTE_ERROR]: RunnerExecuteError,
    [WorkerRunnerCoreErrorCode.RUNNER_DESTROY_ERROR]: RunnerDestroyError,
    [WorkerRunnerCoreErrorCode.RUNNER_DATA_TRANSFER_ERROR]: RunnerDataTransferError,

    [WorkerRunnerCoreErrorCode.HOST_DESTROY_ERROR]: RunnerResolverHostDestroyError,

    [WorkerRunnerCoreErrorCode.UNEXPECTED_ERROR]: WorkerRunnerUnexpectedError,
};
