import { WorkerRunnerErrorCode } from './error-code';
import { WORKER_RUNNER_ERROR_MESSAGES } from './error-message';
import { IRunnerErrorConfigCaptureOpt, IRunnerErrorConfigStack, IWorkerRunnerErrorConfig, WorkerRunnerError, WORKER_RUNNER_ERROR_CODE } from './worker-runner-error';

export class ConnectionWasClosedError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.CONNECTION_WAS_CLOSED;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            name: config.name || ConnectionWasClosedError.name,
            message: config.message ||  WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED(),
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || ConnectionWasClosedError,
        });
    }
}

export class RunnerNotFound extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_NOT_FOUND;
    constructor(config: Readonly<IWorkerRunnerErrorConfig> = {}) {
        super({
            name: config.name || RunnerNotFound.name,
            message: config.message || WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND(),
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || RunnerNotFound,
        });
    }
}

export class RunnerInitError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_INIT_ERROR;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            name: config.name || RunnerInitError.name,
            message: config.message || WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR(),
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || RunnerInitError,
        });
    }
}

export class RunnerExecuteError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_EXECUTE_ERROR;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            name: config.name || RunnerExecuteError.name,
            message: config.message || WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR(),
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || RunnerExecuteError,
        });
    }
}

export class RunnerDestroyError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_DESTROY_ERROR;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            name: config.name || RunnerDestroyError.name,
            message: config.message || WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED(),
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || RunnerDestroyError,
        });
    }
}

export class WorkerDestroyError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_DESTROY_ERROR;
    public originalErrors = new Array<Error>();
    constructor(config: IWorkerRunnerErrorConfig & {originalErrors?: Error[]} = {}) {
        super({
            name: config.name || WorkerDestroyError.name,
            message: config.message || WORKER_RUNNER_ERROR_MESSAGES.WORKER_DESTROY_ERROR(),
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || WorkerDestroyError,
        });
        if (config.originalErrors) {
            this.originalErrors.push(...config.originalErrors);
        }
    }
}
