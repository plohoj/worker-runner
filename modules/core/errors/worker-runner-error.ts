import { Constructor } from '../types/constructor';
import { WorkerRunnerErrorCode } from './error-code';
import { WORKER_RUNNER_ERROR_MESSAGES } from './error-message';

export interface IRunnerErrorConfigBase {
    name?: string;
    message?: string;
}

export interface IRunnerErrorConfigStack {
    stack?: string;
}

export interface IRunnerErrorConfigCaptureOpt {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    captureOpt?: ((...args: any[]) => any) | Constructor;
}

export type IWorkerRunnerErrorConfig = IRunnerErrorConfigBase
    & (IRunnerErrorConfigStack | IRunnerErrorConfigCaptureOpt);

export const WORKER_RUNNER_ERROR_CODE = Symbol('Worker Runner error code');

export abstract class WorkerRunnerError extends Error {
    public abstract [WORKER_RUNNER_ERROR_CODE]: string;

    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super(config.message);
        if ((config as IRunnerErrorConfigStack).stack) {
            this.stack = (config as IRunnerErrorConfigStack).stack;
        } else if (Error.captureStackTrace) {
            if ((config as IRunnerErrorConfigCaptureOpt).captureOpt) {
                Error.captureStackTrace(this, (config as IRunnerErrorConfigCaptureOpt).captureOpt);
            }
            Error.captureStackTrace(WorkerRunnerError);
        }
        this.name = config.name || WorkerRunnerError.name;
    }
}

export class WorkerRunnerUnexpectedError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.UNEXPECTED_ERROR;

    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super({
            name: config.name || WorkerRunnerUnexpectedError.name,
            message: config.message || WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR(),
            stack: (config as IRunnerErrorConfigStack).stack,
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || WorkerRunnerUnexpectedError,
        });
    }
}
