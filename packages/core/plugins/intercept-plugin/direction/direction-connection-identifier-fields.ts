import { Nominal } from '../../../types/nominal';

declare const directionConnectionIdentifierField: unique symbol;
export type DirectionConnectionIdentifierField = Nominal<typeof directionConnectionIdentifierField>;

export interface IDirectionConnectionIdentifierFields {
    from: DirectionConnectionIdentifierField;
}
