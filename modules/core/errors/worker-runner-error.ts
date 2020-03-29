import { Constructor } from '../types/constructor';
import { WorkerRunnerErrorCode } from './error-code';
import { WorkerRunnerErrorMessages } from './error-message';

export interface IRunnerErrorConfigBase {
    message?: string;
    name?: string;
}

export type IRunnerErrorConfigStack = {
    stack?: string;
} | {
    constructorOpt?: ((...args: any[]) => any) | Constructor;
};

export type IWorkerRunnerErrorConfig = IRunnerErrorConfigBase & IRunnerErrorConfigStack;

export const WORKER_RUNNER_ERROR_CODE = Symbol('asd');

export abstract class WorkerRunnerError extends Error {
    public static [WORKER_RUNNER_ERROR_CODE]: number;

    constructor(config: IWorkerRunnerErrorConfig = {}) {
        super(config.message);
        if ('stack' in config) {
            this.stack = config.stack;
        } else if (Error.captureStackTrace) {
            if ('constructorOpt' in config) {
                Error.captureStackTrace(this, config.constructorOpt);
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
            message: config.message || WorkerRunnerErrorMessages.UNEXPECTED_ERROR,
            constructorOpt: WorkerRunnerUnexpectedError,
            name: config.name || WorkerRunnerUnexpectedError.name,
        });
    }
}
