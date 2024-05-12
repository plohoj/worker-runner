import { Nominal } from '../../../types/nominal';

declare const directionConnectionIdentifierField: unique symbol;
export type DirectionConnectionIdentifierField = string & Nominal<typeof directionConnectionIdentifierField>;

export interface IDirectionConnectionIdentifierFields {
    from: DirectionConnectionIdentifierField;
}
