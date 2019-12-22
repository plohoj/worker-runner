import { StackTraceError } from '@core/errors/stacktrace-error';

export enum RxRunnerErrorCode {
    SUBSCRIPTION_NOT_FOUND = 100,
    RUNNER_WAS_DESTROYED,
    ERROR_EMIT,
}

export enum RxRunnerErrorMessages {
    SUBSCRIPTION_NOT_FOUND = 'Subscription of a completed method not found',
    SUBSCRIBER_NOT_FOUND = 'The subscriber was not found after the event was emitted',
    RUNNER_WAS_DESTROYED = 'The runner was destroyed',
}

export type IRxRunnerError = StackTraceError<{
    errorCode: RxRunnerErrorCode;
}>;
