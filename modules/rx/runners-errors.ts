import { StackTraceError } from '@core';

export enum RxRunnerErrorCode {
    SUBSCRIPTION_NOT_FOUND = 100,
    ERROR_EMIT,
}

export enum RxRunnerErrorMessages {
    SUBSCRIPTION_NOT_FOUND = 'Subscription of a completed method not found',
    SUBSCRIBER_NOT_FOUND = 'The subscriber was not found after the event was emitted',
}

export type IRxRunnerError = StackTraceError<{
    errorCode: RxRunnerErrorCode;
}>;
