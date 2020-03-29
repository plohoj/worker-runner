import { WorkerRunnerErrorCode } from './error-code';
import { WorkerRunnerErrorMessages } from './error-message';
import { IWorkerRunnerErrorConfig, WorkerRunnerError, WORKER_RUNNER_ERROR_CODE } from './worker-runner-error';

export class RunnerInitError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_INIT_ERROR;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            message: config.message || WorkerRunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
            constructorOpt: RunnerInitError,
            name: config.name || RunnerInitError.name,
        });
    }
}

export class RunnerNotInitError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_NOT_INIT;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            message: config.message ||  WorkerRunnerErrorMessages.RUNNER_NOT_INIT,
            constructorOpt: RunnerNotInitError,
            name: config.name || RunnerNotInitError.name,
        });
    }
}

export class RunnerExecuteError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_EXECUTE_ERROR;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            message: config.message || WorkerRunnerErrorMessages.RUNNER_NOT_INIT,
            constructorOpt: RunnerExecuteError,
            name: config.name || RunnerExecuteError.name,
        });
    }
}

export class RunnerDestroyError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_DESTROY_ERROR;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            message: config.message || WorkerRunnerErrorMessages.RUNNER_NOT_INIT,
            constructorOpt: RunnerDestroyError,
            name: config.name || RunnerDestroyError.name,
        });
    }
}

export class WorkerNotInitError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.RUNNER_NOT_INIT;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            message: config.message || WorkerRunnerErrorMessages.WORKER_NOT_INIT,
            constructorOpt: WorkerNotInitError,
            name: config.name || WorkerNotInitError.name,
        });
    }
}
