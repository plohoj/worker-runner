import { IStacktraceError, StackTraceError } from './stacktrace-error';

export function extractError(error: any): StackTraceError {
    const extractedError: StackTraceError = {
        error: error ? JSON.parse(JSON.stringify(error)) : error,
    };
    if (error instanceof Error) {
        (extractedError as IStacktraceError).stacktrace = error.stack;
        (extractedError as IStacktraceError).message = error.message;
    }
    return extractedError;
}
