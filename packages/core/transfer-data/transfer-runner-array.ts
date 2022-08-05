/** The wrapper indicates that the array contains elements that must be processed before being passed. */
export class TransferRunnerArray<D extends unknown[] = unknown[]> {
    constructor(
        public data: D,
    ) {}
}
