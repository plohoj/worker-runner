import { DisconnectReason } from '../../../connections/base/disconnect-reason';
import { WorkerRunnerCoreErrorCode } from '../../../errors/core-error-code';
import { ConnectionClosedError } from '../../../errors/runner-errors';
import { PLUGIN_CANNOT_PROCESS_DATA } from '../../plugin-cannot-process-data';
import { DeserializedError, ISerializedError, SerializedErrorType } from '../base/error-serialization-plugin-data';
import { IErrorSerializationPlugin } from '../base/error-serialization.plugin';

export interface ISerializedConnectionClosedError extends ISerializedError {
    disconnectReason: DisconnectReason;
}

export class ConnectionClosedErrorSerializationPlugin implements IErrorSerializationPlugin {
    public deserializeError(serializedError: ISerializedError): DeserializedError | typeof PLUGIN_CANNOT_PROCESS_DATA {
        const isConnectionClosedError = serializedError.type satisfies SerializedErrorType as unknown as string
            === WorkerRunnerCoreErrorCode.CONNECTION_CLOSED;
        if (!isConnectionClosedError) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }
        return new ConnectionClosedError({
            message: serializedError.message,
            stack: serializedError.stack,
            disconnectReason: (serializedError as ISerializedConnectionClosedError).disconnectReason,
        }) as unknown as DeserializedError;
    }

    public serializeError(error: unknown = {}): ISerializedError | typeof PLUGIN_CANNOT_PROCESS_DATA {
        if (!(error instanceof ConnectionClosedError)) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }

        return {
            type: WorkerRunnerCoreErrorCode.CONNECTION_CLOSED satisfies string as unknown as SerializedErrorType,
            message: error.message,
            stack: error.stack,
            disconnectReason: error.disconnectReason,
        } satisfies ISerializedConnectionClosedError as ISerializedError;
    }
}
