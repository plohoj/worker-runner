import { combineErrorConfig, IWorkerRunnerErrorConfig, WorkerRunnerError } from '@worker-runner/core';
import { RX_WORKER_RUNNER_ERROR_MESSAGES } from './error-messages';

// TODO NEED TEST
export class RxSubscriptionNotFoundError extends WorkerRunnerError {
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RxSubscriptionNotFoundError.name,
            message: RX_WORKER_RUNNER_ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND(),
            captureOpt: RxSubscriptionNotFoundError,
        }));
    }
}

export class RxRunnerEmitError extends WorkerRunnerError {
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RxRunnerEmitError.name,
            message: RX_WORKER_RUNNER_ERROR_MESSAGES.EMITTED_ERROR(),
            captureOpt: RxRunnerEmitError,
        }));
    }
}
