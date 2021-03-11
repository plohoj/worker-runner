import { TransferRunnerData } from '@worker-runner/core';

export class WithTransferableRunnerStub {
    constructor(private arrayBuffer?: ArrayBuffer) {}

    transferArrayBuffer(): TransferRunnerData<ArrayBuffer> {
        if (!this.arrayBuffer) {
            throw new Error('arrayBuffer not exist');
        }
        return new TransferRunnerData(this.arrayBuffer, [this.arrayBuffer]);
    }

    setArrayBuffer(arrayBuffer: ArrayBuffer): void {
        this.arrayBuffer = arrayBuffer;
    }

}
