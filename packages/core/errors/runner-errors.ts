import { DisconnectReason } from '../connections/base/disconnect-reason';
import { WORKER_RUNNER_ERROR_MESSAGES } from './error-message';
import { combineErrorConfig, IWorkerRunnerErrorConfig, IWorkerRunnerMultipleErrorConfig, WorkerRunnerError, WorkerRunnerMultipleError } from './worker-runner-error';

export type IConnectionClosedErrorConfig = IWorkerRunnerErrorConfig & {
    disconnectReason: DisconnectReason;
}

export class ConnectionClosedError extends WorkerRunnerError {
    public readonly disconnectReason: DisconnectReason;
    constructor(config: IConnectionClosedErrorConfig) {
        super(combineErrorConfig(config, {
            name: ConnectionClosedError.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED(config),
            captureOpt: ConnectionClosedError,
        }));
        this.disconnectReason = config.disconnectReason;
    }
}

export class RunnerNotFound extends WorkerRunnerError {
    constructor(config: Readonly<IWorkerRunnerErrorConfig> = {}) {
        super(combineErrorConfig(config, {
            name: RunnerNotFound.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND(),
            captureOpt: RunnerNotFound,
        }));
    }
}

export class RunnerInitError extends WorkerRunnerError {
    constructor(config: IWorkerRunnerMultipleErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RunnerInitError.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR(),
            captureOpt: RunnerInitError,
        }));
    }
}

export class RunnerExecuteError extends WorkerRunnerError {
    constructor(config: IWorkerRunnerMultipleErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RunnerExecuteError.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR(),
            captureOpt: RunnerExecuteError,
        }));
    }
}

export class RunnerDestroyError extends WorkerRunnerMultipleError {
    constructor(config: IWorkerRunnerMultipleErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RunnerDestroyError.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                disconnectReason: DisconnectReason.RunnerDestroyed
            }),
            captureOpt: RunnerDestroyError,
        }));
    }
}

export class RunnerDataTransferError extends WorkerRunnerMultipleError {
    constructor(config: IWorkerRunnerMultipleErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RunnerDataTransferError.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.DATA_TRANSFER_PREPARATION_ERROR(),
            captureOpt: RunnerDataTransferError,
        }));
    }
}

export class RunnerResolverClientDestroyError extends WorkerRunnerMultipleError {
    constructor(config: IWorkerRunnerMultipleErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RunnerResolverClientDestroyError.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CLIENT_DESTROY_ERROR(),
            captureOpt: RunnerResolverClientDestroyError,
        }));
    }
}

export class RunnerResolverHostDestroyError extends WorkerRunnerMultipleError {
    constructor(config: IWorkerRunnerMultipleErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RunnerResolverHostDestroyError.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_HOST_DESTROY_ERROR(),
            captureOpt: RunnerResolverHostDestroyError,
        }));
    }
}
