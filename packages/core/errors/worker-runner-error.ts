import { AbstractConstructor, Constructor } from '../types/constructor';
import { WorkerRunnerErrorCode } from './error-code';
import { WORKER_RUNNER_ERROR_MESSAGES } from './error-message';

export interface IRunnerErrorConfigBase {
    name?: string;
    message?: string;
}

interface IRunnerErrorConfigStack {
    stack?: string;
}

export interface IRunnerErrorConfigCaptureOpt {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    captureOpt?: ((...args: any[]) => any) | Constructor | AbstractConstructor;
}

export type IWorkerRunnerErrorConfig = IRunnerErrorConfigBase
    & (IRunnerErrorConfigStack | IRunnerErrorConfigCaptureOpt);

export const WORKER_RUNNER_ERROR_CODE = '__workerRunner_errorCode';

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

export interface IRunnerErrorConfigOriginalErrors {
    originalErrors?: unknown[];
}

export type IWorkerRunnerMultipleErrorConfig = IWorkerRunnerErrorConfig & IRunnerErrorConfigOriginalErrors;

export abstract class WorkerRunnerMultipleError extends WorkerRunnerError {
    public readonly originalErrors?: ReadonlyArray<unknown>;
    constructor(config: IWorkerRunnerMultipleErrorConfig = {}) {
        super(combineErrorConfig( config, {
            captureOpt: (config as IRunnerErrorConfigCaptureOpt).captureOpt || WorkerRunnerMultipleError,
        }));
        if (config.originalErrors) {
            this.originalErrors = config.originalErrors;
        }
    }
}

export class WorkerRunnerUnexpectedError extends WorkerRunnerError {
    public [WORKER_RUNNER_ERROR_CODE] = WorkerRunnerErrorCode.UNEXPECTED_ERROR;

    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super(combineErrorConfig(config, {
            name: WorkerRunnerUnexpectedError.name,
            message: WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR(),
            captureOpt: WorkerRunnerUnexpectedError,
        }));
    }
}

export type IWorkerRunnerAlternativeErrorConfig = IRunnerErrorConfigBase & IRunnerErrorConfigCaptureOpt;

export function combineErrorConfig(
    primaryConfig: IWorkerRunnerMultipleErrorConfig,
    alternativeConfig: IWorkerRunnerAlternativeErrorConfig,
): IWorkerRunnerErrorConfig {
    const config: IWorkerRunnerErrorConfig = {
        name: primaryConfig.name || alternativeConfig.name,
        message: primaryConfig.message || alternativeConfig.message,
    };
    const stack = (primaryConfig as IRunnerErrorConfigStack).stack || (alternativeConfig as IRunnerErrorConfigStack).stack
    if (stack) {
        (config as IRunnerErrorConfigStack).stack = stack;
    } else {
        (config as IRunnerErrorConfigCaptureOpt).captureOpt = (primaryConfig as IRunnerErrorConfigCaptureOpt).captureOpt
            || (alternativeConfig as IRunnerErrorConfigCaptureOpt).captureOpt
    }
    if (primaryConfig.originalErrors?.length) {
        (config as IWorkerRunnerMultipleErrorConfig).originalErrors = primaryConfig.originalErrors;
    }
    return config;
}
