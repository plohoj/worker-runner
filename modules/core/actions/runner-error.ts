import { RunnerErrorCode } from '../errors/runners-errors';
import { IStacktraceError, StackTraceError } from '../errors/stacktrace-error';
import { IRunnerEnvironmentDestroyErrorAction, IRunnerEnvironmentExecuteErrorAction, IRunnerEnvironmentInitErrorAction } from './runner-environment.actions';

export type IRunnerError = StackTraceError<{
    errorCode: RunnerErrorCode;
}>;


export function errorActionToRunnerError(errorAction: IRunnerEnvironmentInitErrorAction
        | IRunnerEnvironmentExecuteErrorAction | IRunnerEnvironmentDestroyErrorAction): IRunnerError {
    const runnerError: IRunnerError = {
        error: errorAction.error,
        errorCode: errorAction.errorCode,
    };
    if ('stacktrace' in errorAction) {
        (runnerError as IRunnerError & IStacktraceError).stacktrace = errorAction.stacktrace;
    }
    if ('message' in errorAction) {
        (runnerError as IRunnerError & IStacktraceError).message = errorAction.message;
    }
    return runnerError;
}
