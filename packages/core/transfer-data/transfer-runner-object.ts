/** The wrapper indicates that the object contains fields that must be processed before being passed. */
export class TransferRunnerObject<D extends Record<string | number, unknown> = Record<string | number, unknown>> {
    constructor(
        public data: D,
    ) {}
}
