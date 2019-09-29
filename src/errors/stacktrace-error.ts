interface IError {
    error: any;
}

export interface IStacktraceError extends IError {
    message: string;
    stacktrace?: string;
}

export type StackTraceError<T extends {} = {}> = (T & IError) | (T & IStacktraceError);
