import { WorkerRunnerErrorCode } from './error-code';
import { WORKER_RUNNER_ERROR_MESSAGES } from './error-message';
import { IRunnerErrorConfigCaptureOpt, IRunnerErrorConfigStack, IWorkerRunnerErrorConfig, WorkerRunnerError, WORKER_RUNNER_ERROR_CODE } from './worker-runner-error';

export class RunnerInitError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_INIT_ERROR;
    constructor(config: Readonly<IWorkerRunnerErrorConfig> = {}) {
        super({
            name: config.name || RunnerInitError.name,
            message: config.message || WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND(),
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || RunnerInitError,
        });
    }
}

export class RunnerWasDisconnectedError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_NOT_INIT;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            name: config.name || RunnerWasDisconnectedError.name,
            message: config.message ||  WORKER_RUNNER_ERROR_MESSAGES.RUNNER_WAS_DISCONNECTED(),
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || RunnerWasDisconnectedError,
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
            message: config.message || WORKER_RUNNER_ERROR_MESSAGES.RUNNER_WAS_DISCONNECTED(),
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || RunnerDestroyError,
        });
    }
}

export class WorkerNotInitError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_NOT_INIT;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            name: config.name || WorkerNotInitError.name,
            message: config.message || WORKER_RUNNER_ERROR_MESSAGES.WORKER_NOT_INIT(),
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || WorkerNotInitError,
        });
    }
}
