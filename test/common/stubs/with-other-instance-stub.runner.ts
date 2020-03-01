import { JsonObject, ResolveRunner } from '@worker-runner/core';
import { ExecutableStubRunner } from './executable-stub.runner';

export class WithOtherInstanceStubRunner<T extends JsonObject = JsonObject> {

    constructor(private executableStubRunner?: ResolveRunner<ExecutableStubRunner<T>>) {}

    public async getInstanceStage(): Promise<T | undefined> {
        return this.executableStubRunner?.getStage() as T | undefined;
    }

    public async pullInstanceStage(
        executableStubRunner: ResolveRunner<ExecutableStubRunner<T>>,
    ): Promise<T | undefined> {
        const stage = await executableStubRunner.getStage();
        executableStubRunner.disconnect();
        return stage as T | undefined;
    }
}
