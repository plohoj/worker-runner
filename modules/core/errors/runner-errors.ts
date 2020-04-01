import { WorkerRunnerErrorCode } from './error-code';
import { WorkerRunnerErrorMessages } from './error-message';
import { IRunnerErrorConfigCaptureOpt, IRunnerErrorConfigStack, IWorkerRunnerErrorConfig, WorkerRunnerError, WORKER_RUNNER_ERROR_CODE } from './worker-runner-error';

export class RunnerInitError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_INIT_ERROR;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            name: config.name || RunnerInitError.name,
            message: config.message || WorkerRunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || RunnerInitError,
        });
    }
}

export class RunnerNotInitError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_NOT_INIT;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            name: config.name || RunnerNotInitError.name,
            message: config.message ||  WorkerRunnerErrorMessages.RUNNER_NOT_INIT,
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || RunnerNotInitError,
        });
    }
}

export class RunnerExecuteError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_EXECUTE_ERROR;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            name: config.name || RunnerExecuteError.name,
            message: config.message || WorkerRunnerErrorMessages.RUNNER_NOT_INIT,
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
            message: config.message || WorkerRunnerErrorMessages.RUNNER_NOT_INIT,
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
            message: config.message || WorkerRunnerErrorMessages.WORKER_NOT_INIT,
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || WorkerNotInitError,
        });
    }
}
