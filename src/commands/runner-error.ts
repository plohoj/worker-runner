import { RunnerErrorCode } from "../errors/runners-errors";
import { IStacktraceError, StackTraceError } from "../errors/stacktrace-error";
import { IWorkerCommandRunnerDestroyError, IWorkerCommandRunnerExecuteError, IWorkerCommandRunnerInitError } from "./worker-commands";

export type IRunnerError = StackTraceError<{
    errorCode: RunnerErrorCode;
}>;


export function errorCommandToRunnerError(errorCommand: IWorkerCommandRunnerInitError
        | IWorkerCommandRunnerExecuteError | IWorkerCommandRunnerDestroyError): IRunnerError {
    const runnerError: IRunnerError = {
        error: errorCommand.error,
        errorCode: errorCommand.errorCode,
    };
    if ('stacktrace' in errorCommand) {
        (runnerError as IRunnerError & IStacktraceError).stacktrace = errorCommand.stacktrace;
        (runnerError as IRunnerError & IStacktraceError).message = errorCommand.message;
    }
    return runnerError;
}