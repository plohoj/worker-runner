import { WorkerRunnerErrorCode } from './error-code';
import { CODE_TO_ERROR_MAP } from './error-code-map';
import { WorkerRunnerErrorMessages } from './error-message';
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
            return {
                errorCode: (error as any)[WORKER_RUNNER_ERROR_CODE]
                    || alternativeError.errorCode || WorkerRunnerErrorCode.UNEXPECTED_ERROR,
                name: error.name || alternativeError.name ||  WorkerRunnerUnexpectedError.name,
                message: error.message || alternativeError.message || WorkerRunnerErrorMessages.UNEXPECTED_ERROR,
                stack: error.stack || alternativeError.stack,
            };
        }
        return {
            errorCode: alternativeError.errorCode || WorkerRunnerErrorCode.UNEXPECTED_ERROR,
            name: alternativeError.name || WorkerRunnerUnexpectedError.name,
            message: error ? String(error) : (alternativeError.message || WorkerRunnerErrorMessages.UNEXPECTED_ERROR),
            stack: alternativeError.stack,
        };
    }

    public deserialize(error: ISerializedError): WorkerRunnerError {
        let errorConstructor = CODE_TO_ERROR_MAP[error.errorCode];
        if (!errorConstructor) {
            errorConstructor = WorkerRunnerUnexpectedError;
        }
        return new errorConstructor({
            constructorOpt: this.deserialize,
            ...error,
        });
    }
}

export const WORKER_RUNNER_ERROR_SERIALIZER = new WorkerRunnerErrorSerializer();
