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
