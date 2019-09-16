import { IWorkerCommandRunnerDestroyError, IWorkerCommandRunnerExecuteError, IWorkerCommandRunnerInitError } from "./worker-commands";
import { WorkerErrorCode } from "./worker-error-code";

export interface IRunnerError {
    error: any;
    errorCode: WorkerErrorCode;
}

export function errorCommandToRunnerError(errorCommand: IWorkerCommandRunnerInitError
        | IWorkerCommandRunnerExecuteError | IWorkerCommandRunnerDestroyError): IRunnerError {
    return {
        error: errorCommand.error,
        errorCode: errorCommand.errorCode,
    };
}