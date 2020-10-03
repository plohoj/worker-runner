import { WorkerRunnerErrorCode } from './error-code';
import { CODE_TO_ERROR_MAP } from './error-code-map';
import { WORKER_RUNNER_ERROR_MESSAGES } from './error-message';
import { IRunnerErrorConfigBase, WorkerRunnerError, WorkerRunnerUnexpectedError, WORKER_RUNNER_ERROR_CODE } from './worker-runner-error';

export interface ISerializedError<C extends string = string>
    extends IRunnerErrorConfigBase {

    errorCode: C;
    name: string;
    stack?: string;
    message: string;
}

export interface ISerializedErrorAction<
    T, C extends string = string
> extends ISerializedError<C> {
    type: T;
}

export class WorkerRunnerErrorSerializer {
    protected readonly codeToErrorMap = CODE_TO_ERROR_MAP;

    public serialize(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any = {},
        alternativeError: Partial<ISerializedError> = {},
    ): ISerializedError {
        if (error instanceof Error) {
            let errorCode: string | undefined = (error as WorkerRunnerError)[WORKER_RUNNER_ERROR_CODE];
            if (typeof errorCode !== 'string') {
                errorCode = alternativeError.errorCode;
                if (typeof errorCode !== 'string') {
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
            errorCode: typeof alternativeError.errorCode === 'string'
                ? alternativeError.errorCode
                : WorkerRunnerErrorCode.UNEXPECTED_ERROR,
            name: alternativeError.name || WorkerRunnerUnexpectedError.name,
            message: error
                ? String(error)
                : (alternativeError.message || WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR()),
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
