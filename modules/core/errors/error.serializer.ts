import { WorkerRunnerErrorCode } from './error-code';
import { CODE_TO_ERROR_MAP } from './error-code-map';
import { WORKER_RUNNER_ERROR_MESSAGES } from './error-message';
import { IRunnerErrorConfigBase, WorkerRunnerError, WorkerRunnerUnexpectedError, WORKER_RUNNER_ERROR_CODE } from './worker-runner-error';

export interface ISerializedError<C extends number = number>
    extends IRunnerErrorConfigBase {

    errorCode: C;
    name: string;
    stack?: string;
    message: string;
}

export interface ISerializedErrorAction<T, C extends number = number>
    extends ISerializedError<C> {

    id: number;
    type: T;
}

export class WorkerRunnerErrorSerializer {
    protected readonly codeToErrorMap = CODE_TO_ERROR_MAP;

    public serialize(
        error: any = {},
        alternativeError: Partial<ISerializedError> = {},
    ): ISerializedError {
        if (error instanceof Error) {
            let errorCode: number | undefined = (error as WorkerRunnerError)[WORKER_RUNNER_ERROR_CODE];
            if (typeof errorCode !== 'number') {
                errorCode = alternativeError.errorCode;
                if (typeof errorCode !== 'number') {
                    errorCode = WorkerRunnerErrorCode.UNEXPECTED_ERROR;
                }
            }
            return {
                errorCode,
                name: error.name || alternativeError.name ||  WorkerRunnerUnexpectedError.name,
                message: error.message || alternativeError.message || WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR(),
                stack: error.stack || alternativeError.stack,
            };
        }
        return {
            errorCode: typeof alternativeError.errorCode === 'number' ?
                alternativeError.errorCode : WorkerRunnerErrorCode.UNEXPECTED_ERROR,
            name: alternativeError.name || WorkerRunnerUnexpectedError.name,
            message: error ? String(error) : (alternativeError.message
                || WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR()),
            stack: alternativeError.stack,
        };
    }

    public deserialize(error: ISerializedError): WorkerRunnerError {
        let errorConstructor = this.codeToErrorMap[error.errorCode];
        if (!errorConstructor) {
            errorConstructor = WorkerRunnerUnexpectedError;
        }
        return new errorConstructor({
            captureOpt: this.deserialize,
            ...error,
        });
    }
}

export const WORKER_RUNNER_ERROR_SERIALIZER = new WorkerRunnerErrorSerializer();
