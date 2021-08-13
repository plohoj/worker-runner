import { CODE_TO_ERROR_MAP, ICodeToErrorMap } from '@worker-runner/core';
import { RxWorkerRunnerErrorCode } from './error-code';
import { RxRunnerEmitError, RxSubscriptionNotFoundError } from './runner-errors';

// TODO check
export const CODE_TO_RX_ERROR_MAP: ICodeToErrorMap = {
    ... CODE_TO_ERROR_MAP,

    [RxWorkerRunnerErrorCode.SUBSCRIPTION_NOT_FOUND]: RxSubscriptionNotFoundError,
    [RxWorkerRunnerErrorCode.ERROR_EMIT]: RxRunnerEmitError,
};
