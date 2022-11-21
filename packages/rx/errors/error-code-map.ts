import { ICoreCodeToErrorMap } from '@worker-runner/core';
import { RxWorkerRunnerErrorCode } from './error-code';
import { RxRunnerEmitError, RxSubscriptionNotFoundError } from './runner-errors';

export const RX_ERROR_CODE_MAP: ICoreCodeToErrorMap = {
    [RxWorkerRunnerErrorCode.SUBSCRIPTION_NOT_FOUND]: RxSubscriptionNotFoundError,
    [RxWorkerRunnerErrorCode.ERROR_EMIT]: RxRunnerEmitError,
};
