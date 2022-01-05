import { TransferableJsonObject } from '../types/json-object';

/** Allows you to use `Transferable` data as argument or a method result. */
export class TransferRunnerData<
    D extends TransferableJsonObject = TransferableJsonObject,
    T extends Transferable = Transferable
> {
    constructor(
        public data: D,
        public transfer: T[],
    ) {}
}
