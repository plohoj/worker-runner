export type SerializedErrorType = 'FAKE_TYPE_FOR_SERIALIZED_ERROR_TYPE' | symbol;
export type DeserializedError = 'FAKE_TYPE_FOR_DESERIALIZED_ERROR' | symbol;

export interface ISerializedError {
    type: SerializedErrorType;
    message: string;
    name?: string;
    stack?: string;
    originalErrors?: ISerializedError[];
}
