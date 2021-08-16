import { combineErrorConfig, IWorkerRunnerErrorConfig, WorkerRunnerError, WORKER_RUNNER_ERROR_CODE } from '@worker-runner/core';
import { RxWorkerRunnerErrorCode } from './error-code';
import { RX_WORKER_RUNNER_ERROR_MESSAGES } from './error-messages';

// TODO NEED TEST
export class RxSubscriptionNotFoundError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = RxWorkerRunnerErrorCode.SUBSCRIPTION_NOT_FOUND;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RxSubscriptionNotFoundError.name,
            message: RX_WORKER_RUNNER_ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND(),
            captureOpt: RxSubscriptionNotFoundError,
        }));
    }
}

export class RxRunnerEmitError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = RxWorkerRunnerErrorCode.ERROR_EMIT;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: RxRunnerEmitError.name,
            message: RX_WORKER_RUNNER_ERROR_MESSAGES.EMITTED_ERROR(),
            captureOpt: RxRunnerEmitError,
        }));
    }
}
