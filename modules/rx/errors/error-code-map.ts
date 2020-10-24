import { CODE_TO_ERROR_MAP, Constructor, IWorkerRunnerErrorConfig, WorkerRunnerError } from '@worker-runner/core';
import { RxWorkerRunnerErrorCode } from './error-code';
import { RxRunnerEmitError, RxSubscriptionNotFoundError } from './runner-errors';

// TODO check
export const CODE_TO_RX_ERROR_MAP: Record<string, Constructor<WorkerRunnerError, [IWorkerRunnerErrorConfig]>> = {
    [RxWorkerRunnerErrorCode.SUBSCRIPTION_NOT_FOUND]: RxSubscriptionNotFoundError,
    [RxWorkerRunnerErrorCode.ERROR_EMIT]: RxRunnerEmitError,
    ... CODE_TO_ERROR_MAP,
};
