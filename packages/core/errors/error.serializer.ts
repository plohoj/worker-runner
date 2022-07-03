import { Constructor } from '../types/constructor';
import { WorkerRunnerErrorCode } from './error-code';
import { CODE_TO_ERROR_MAP } from './error-code-map';
import { WORKER_RUNNER_ERROR_MESSAGES } from './error-message';
import { IRunnerErrorConfigBase, IRunnerErrorConfigCaptureOpt, WorkerRunnerError, WorkerRunnerMultipleError, WorkerRunnerUnexpectedError, WORKER_RUNNER_ERROR_CODE } from './worker-runner-error';

export interface ISerializedError extends IRunnerErrorConfigBase {
    errorCode: string;
    name: string;
    stack?: string;
    message: string;
    originalErrors?: ISerializedError[];
}

export class ErrorSerializer {
    protected readonly codeToErrorMap = CODE_TO_ERROR_MAP;

    public normalize<
        E extends Constructor<WorkerRunnerError, [Pick<IRunnerErrorConfigBase, 'message'>]>,
        C extends ConstructorParameters<E>[0],
    >(
        error: unknown,
        alternativeErrorConstructor: E,
        config?: C,
    ): Error | E {
        if (error instanceof Error) {
            return error;
        }
        const errorConfig = {...config};
        const errorMessage = error && String(error);
        if (errorMessage) {
            errorConfig.message = errorMessage as string;
        }
        (errorConfig as IRunnerErrorConfigCaptureOpt).captureOpt = this.normalize;
        return new alternativeErrorConstructor(errorConfig);
    }

    public serialize(error: unknown = {}): ISerializedError {
        const errorCode = (error as WorkerRunnerError)[WORKER_RUNNER_ERROR_CODE]
            ?? (error instanceof Error ? WorkerRunnerErrorCode.OTHER_ERROR : undefined)
            ?? WorkerRunnerErrorCode.UNEXPECTED_ERROR;

        let serializedError: ISerializedError;

        if (error instanceof Error) {
            serializedError = {
                errorCode,
                name: error.name || WorkerRunnerUnexpectedError.name,
                message: error.message || WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR(),
                stack: error.stack,
            };
            if (!serializedError.stack) {
                Error.captureStackTrace?.(this.serialize);
            }
            if (!serializedError.stack) {
                // eslint-disable-next-line unicorn/error-message
                serializedError.stack = new Error().stack;
            }
            if (error instanceof WorkerRunnerMultipleError && error.originalErrors) {
                serializedError.originalErrors = error.originalErrors.map(
                    originalError => this.serialize(originalError)
                );
            }
        } else {
            serializedError = {
                errorCode,
                name: WorkerRunnerUnexpectedError.name,
                message: error
                    ? String(error)
                    : WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR(),
            };
            Error.captureStackTrace?.(this.serialize);
            if (!serializedError.stack) {
                // eslint-disable-next-line unicorn/error-message
                serializedError.stack = new Error().stack;
            }
        }
        return serializedError;
    }

    public deserialize(error: ISerializedError): Error {
        if (error.errorCode === WorkerRunnerErrorCode.OTHER_ERROR) {
            const otherError = new Error(error.message);
            otherError.name = error.name;
            if (error.stack) {
                otherError.stack = error.stack;
            }
            return otherError;
        }
        const errorConstructor = this.codeToErrorMap[error.errorCode] || WorkerRunnerUnexpectedError;
        return new errorConstructor({
            captureOpt: this.deserialize,
            ...error,
            originalErrors: error.originalErrors?.map(originalError => this.deserialize(originalError))
        });
    }
}

export const WORKER_RUNNER_ERROR_SERIALIZER = new ErrorSerializer();
