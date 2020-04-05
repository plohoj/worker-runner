import { IRunnerErrorConfigCaptureOpt, IRunnerErrorConfigStack, IWorkerRunnerErrorConfig, WorkerRunnerError, WORKER_RUNNER_ERROR_CODE } from '@worker-runner/core';
import { RxWorkerRunnerErrorCode } from './error-code';
import { RX_WORKER_RUNNER_ERROR_MESSAGES } from './error-messages';

export class RxRunnerSubscriptionNotFoundError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = RxWorkerRunnerErrorCode.SUBSCRIPTION_NOT_FOUND;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            message: config.message || RX_WORKER_RUNNER_ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND(),
            name: config.name || RxRunnerSubscriptionNotFoundError.name,
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || RxRunnerSubscriptionNotFoundError,
        });
    }
}

export class RxRunnerEmitError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = RxWorkerRunnerErrorCode.ERROR_EMIT;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            name: config.name || RxRunnerEmitError.name,
            message: config.message ||  RX_WORKER_RUNNER_ERROR_MESSAGES.SUBSCRIBER_NOT_FOUND(),
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || RxRunnerEmitError,
        });
    }
}
