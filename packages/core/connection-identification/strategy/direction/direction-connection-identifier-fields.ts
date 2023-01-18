import { Nominal } from '../../../types/nominal';

export enum DirectionConnectionIdentifierDefaultEnum {
    Host = 'WORKER_RUNNER_HOST',
    Client = 'WORKER_RUNNER_CLIENT',
}

declare const directionConnectionIdentifierField: unique symbol;
export type DirectionConnectionIdentifierField = Nominal<typeof directionConnectionIdentifierField>;

export interface IDirectionConnectionIdentifierFields {
    from: DirectionConnectionIdentifierField;
}
