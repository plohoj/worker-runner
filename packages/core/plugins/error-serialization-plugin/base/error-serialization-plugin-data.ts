import { Nominal } from '../../../types/nominal';

declare const serializedErrorType: unique symbol;
export type SerializedErrorType = Nominal<typeof serializedErrorType>;

declare const deserializedError: unique symbol;
export type DeserializedError = Nominal<typeof deserializedError>;

export interface ISerializedError {
    type: SerializedErrorType;
    message: string;
    name?: string;
    stack?: string;
    originalErrors?: ISerializedError[];
}
