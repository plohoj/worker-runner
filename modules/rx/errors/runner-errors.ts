import { IWorkerRunnerErrorConfig, WorkerRunnerError, WORKER_RUNNER_ERROR_CODE } from '@worker-runner/core';
import { RxWorkerRunnerErrorCode } from './error-code';
import { RxWorkerRunnerErrorMessages } from './error-messages';

export class RxRunnerSubscriptionNotFoundError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = RxWorkerRunnerErrorCode.SUBSCRIPTION_NOT_FOUND;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            message: config.message || RxWorkerRunnerErrorMessages.SUBSCRIPTION_NOT_FOUND,
            constructorOpt: RxRunnerSubscriptionNotFoundError,
            name: config.name || RxRunnerSubscriptionNotFoundError.name,
        });
    }
}

export class RxRunnerEmitError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = RxWorkerRunnerErrorCode.ERROR_EMIT;
    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            message: config.message ||  RxWorkerRunnerErrorMessages.SUBSCRIBER_NOT_FOUND,
            constructorOpt: RxRunnerEmitError,
            name: config.name || RxRunnerEmitError.name,
        });
    }
}
