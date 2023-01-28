import { Nominal } from '../../types/nominal';

declare const dataForSendRunner: unique symbol;
/**
 * Fields that must be attached to an object with a serialized Runner as an argument
 * or to an action with the result of a method execution
 */
export type DataForSendRunner = Nominal<typeof dataForSendRunner>;

export interface IPreparedForSendRunnerDataBase {
    data: DataForSendRunner,
    transfer?: Transferable[],
}
