import { CODE_TO_ERROR_MAP, Constructor, IWorkerRunnerErrorConfig, WorkerRunnerError } from '@worker-runner/core';
import { RxWorkerRunnerErrorCode } from './error-code';
import { RxRunnerEmitError, RxRunnerSubscriptionNotFoundError } from './runner-errors';

export const CODE_TO_RX_ERROR_MAP: Record<number, Constructor<WorkerRunnerError, [IWorkerRunnerErrorConfig]>> = {
    [RxWorkerRunnerErrorCode.SUBSCRIPTION_NOT_FOUND]: RxRunnerSubscriptionNotFoundError,
    [RxWorkerRunnerErrorCode.ERROR_EMIT]: RxRunnerEmitError,
    ... CODE_TO_ERROR_MAP,
};
