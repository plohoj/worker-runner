import { TransferableJsonObject } from './types/json-object';

export class TransferRunnerData<
    D extends TransferableJsonObject = TransferableJsonObject,
    T extends Transferable = Transferable
> {
    constructor(
        public data: D,
        public transfer: T[],
    ) { }
}
