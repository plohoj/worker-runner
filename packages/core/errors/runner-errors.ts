import { WorkerRunnerErrorCode } from './error-code';
import { WORKER_RUNNER_ERROR_MESSAGES } from './error-message';
import { combineErrorConfig, IWorkerRunnerErrorConfig, IWorkerRunnerMultipleErrorConfig, WorkerRunnerError, WorkerRunnerMultipleError, WORKER_RUNNER_ERROR_CODE } from './worker-runner-error';

export class ConnectionWasClosedError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.CONNECTION_WAS_CLOSED;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: ConnectionWasClosedError.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED(),
            captureOpt: ConnectionWasClosedError,
        }));
    }
}

export class RunnerNotFound extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_NOT_FOUND;
    constructor(config: Readonly<IWorkerRunnerErrorConfig> = {}) {
        super(combineErrorConfig(config, {
            name: RunnerNotFound.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND(),
            captureOpt: RunnerNotFound,
        }));
    }
}

export class RunnerInitError extends WorkerRunnerMultipleError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_INIT_ERROR;
    constructor(config: IWorkerRunnerMultipleErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RunnerInitError.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR(),
            captureOpt: RunnerInitError,
        }));
    }
}

export class RunnerExecuteError extends WorkerRunnerMultipleError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_EXECUTE_ERROR;
    constructor(config: IWorkerRunnerMultipleErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RunnerExecuteError.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR(),
            captureOpt: RunnerExecuteError,
        }));
    }
}

export class RunnerDestroyError extends WorkerRunnerMultipleError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_DESTROY_ERROR;
    constructor(config: IWorkerRunnerMultipleErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RunnerDestroyError.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED(),
            captureOpt: RunnerDestroyError,
        }));
    }
}

export class RunnerResolverHostDestroyError extends WorkerRunnerMultipleError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_DESTROY_ERROR;
    constructor(config: IWorkerRunnerMultipleErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RunnerResolverHostDestroyError.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_HOST_DESTROY_ERROR(),
            captureOpt: RunnerResolverHostDestroyError,
        }));
    }
}
