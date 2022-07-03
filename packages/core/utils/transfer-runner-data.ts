import { TransferableJsonLike } from '../types/json-like';

/** Allows you to use `Transferable` data as argument or a method result. */
export class TransferRunnerData<
    D extends TransferableJsonLike = TransferableJsonLike,
    T extends Transferable = Transferable
> {
    constructor(
        public data: D,
        public transfer: T[],
    ) {}
}

// TODO new TransferRunnerObject({...}), TransferRunnerArray([...])
// example: TransferRunnerObject({simpleField: 1, field: TransferRunnerArray([1, 2, TransferRunnerData(messagePort)])})
// TODO use TransferRunnerData, TransferRunnerObject and TransferRunnerArray only as 
