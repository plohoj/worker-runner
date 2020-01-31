import { JsonObject } from '@worker-runner/core';
import { ExecutableStubRunner } from './executable-stub.runner';

export class WithOtherInstanceStubRunner<T extends JsonObject = JsonObject> {

    constructor(private executableStubRunner?: ExecutableStubRunner<T>) {}

    public getInstanceStage(): T {
        return this.executableStubRunner?.getStage() as T;
    }

    public pullInstanceStage(executableStubRunner: ExecutableStubRunner<T> ): T {
        return executableStubRunner?.getStage() as T;
    }
}
