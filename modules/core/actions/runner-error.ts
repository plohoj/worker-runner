import { RunnerErrorCode } from '../errors/runners-errors';
import { IStacktraceError, StackTraceError } from '../errors/stacktrace-error';
import { IWorkerRunnerDestroyErrorAction, IWorkerRunnerExecuteErrorAction, IWorkerRunnerInitErrorAction } from './worker-actions';

export type IRunnerError = StackTraceError<{
    errorCode: RunnerErrorCode;
}>;


export function errorActionToRunnerError(errorAction: IWorkerRunnerInitErrorAction
        | IWorkerRunnerExecuteErrorAction | IWorkerRunnerDestroyErrorAction): IRunnerError {
    const runnerError: IRunnerError = {
        error: errorAction.error,
        errorCode: errorAction.errorCode,
    };
    if ('stacktrace' in errorAction) {
        (runnerError as IRunnerError & IStacktraceError).stacktrace = errorAction.stacktrace;
        (runnerError as IRunnerError & IStacktraceError).message = errorAction.message;
    }
    return runnerError;
}
