import { WorkerRunnerCoreErrorCode } from '../../../errors/core-error-code';
import { WorkerRunnerUnexpectedError } from '../../../errors/worker-runner-error';
import { PLUGIN_CANNOT_PROCESS_DATA } from '../../plugin-cannot-process-data';
import { DeserializedError, ISerializedError, SerializedErrorType } from '../base/error-serialization-plugin-data';
import { IErrorSerializationPlugin } from '../base/error-serialization.plugin';

export class FallbackErrorSerializationPlugin implements IErrorSerializationPlugin {

    public deserializeError(): DeserializedError | typeof PLUGIN_CANNOT_PROCESS_DATA {
        throw new WorkerRunnerUnexpectedError({
            message: 'Unknown errors should be converted to a generalized unexpected error.'
        });
    }

    public serializeError(error: unknown = {}): ISerializedError {
        const serializedError: ISerializedError = {
            type: WorkerRunnerCoreErrorCode.UNEXPECTED_ERROR as string as SerializedErrorType,
            name: (error as Error)?.name,
            message: (error as Error)?.message || String(error),
            stack: (error as Error)?.stack,
        };

        if (!serializedError.stack) {
            // eslint-disable-next-line @typescript-eslint/unbound-method
            Error.captureStackTrace?.(serializedError, this.serializeError);
        }
        if (!serializedError.stack) {
            // eslint-disable-next-line unicorn/error-message
            serializedError.stack = new Error().stack;
        }

        return serializedError;
    }
}
