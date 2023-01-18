import { Nominal } from '../../../types/nominal';

declare const connectionIdentifier: unique symbol;
export type ConnectionIdentifier = Nominal<typeof connectionIdentifier>;

export interface IIdConnectionIdentifierFields {
    connectionId: ConnectionIdentifier;
}

export interface IIdConnectionIdentifierNewFields {
    newConnectionId: ConnectionIdentifier;
}

export interface IIdConnectionIdentifierReplacedFields extends IIdConnectionIdentifierFields{
    oldConnectionId: ConnectionIdentifier;
}
