import { WorkerRunnerErrorCode } from './error-code';
import { CODE_TO_ERROR_MAP } from './error-code-map';
import { WORKER_RUNNER_ERROR_MESSAGES } from './error-message';
import { HostResolverDestroyError } from './runner-errors';
import { IRunnerErrorConfigBase, WorkerRunnerError, WorkerRunnerUnexpectedError, WORKER_RUNNER_ERROR_CODE } from './worker-runner-error';

export interface ISerializedError extends IRunnerErrorConfigBase {
    errorCode: string;
    name: string;
    stack?: string;
    message: string;
    originalErrors?: ISerializedError[];
}

export interface ISerializedErrorAction<T> extends ISerializedError {
    type: T;
}

export class WorkerRunnerErrorSerializer {
    protected readonly codeToErrorMap = CODE_TO_ERROR_MAP;

    public serialize(
        error: unknown = {},
        alternativeError: Partial<ISerializedError> | WorkerRunnerError = {},
    ): ISerializedError {
        const errorCode = (error as WorkerRunnerError)[WORKER_RUNNER_ERROR_CODE]
            ?? (alternativeError as WorkerRunnerError)[WORKER_RUNNER_ERROR_CODE]
            ?? (alternativeError as Partial<ISerializedError>).errorCode
            ?? WorkerRunnerErrorCode.UNEXPECTED_ERROR;
        let serializedError: ISerializedError;
        if (error instanceof Error) {
            serializedError = {
                errorCode,
                name: error.name || alternativeError.name || WorkerRunnerUnexpectedError.name,
                message: error.message || alternativeError.message || WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR(),
                stack: error.stack || alternativeError.stack || new Error().stack,
            };
            if (error instanceof HostResolverDestroyError) {
                serializedError.originalErrors = error.originalErrors.map(
                    originalError => this.serialize(originalError)
                );
            }
        } else {
            serializedError = {
                errorCode,
                name: alternativeError.name || WorkerRunnerUnexpectedError.name,
                message: error
                    ? String(error)
                    : (alternativeError.message || WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR()),
                stack: alternativeError.stack || new Error().stack,
            };
        }
        if (!serializedError.originalErrors) {
            if (alternativeError instanceof HostResolverDestroyError) {
                serializedError.originalErrors = alternativeError.originalErrors.map(
                    originalError => this.serialize(originalError)
                );
            }
        }
        return serializedError;
    }

    public deserialize(error: ISerializedError): WorkerRunnerError {
        if (error.errorCode === WorkerRunnerErrorCode.WORKER_DESTROY_ERROR) {
            return new HostResolverDestroyError({
                captureOpt: this.deserialize,
                ...error,
                originalErrors: error.originalErrors?.map(originalError => this.deserialize(originalError))
            });
        }
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
