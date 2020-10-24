import { JsonObject, ResolvedRunner } from '@worker-runner/core';
import { ExecutableStubRunner } from './executable-stub.runner';

export class WithOtherInstanceStubRunner<T extends JsonObject = JsonObject> {

    constructor(private executableStubRunner?: ResolvedRunner<ExecutableStubRunner<T>>) {}

    public async getInstanceStage(): Promise<T | undefined> {
        return this.executableStubRunner?.getStage() as T | undefined;
    }

    public async pullInstanceStage(
        executableStubRunner: ResolvedRunner<ExecutableStubRunner<T>>,
    ): Promise<T | undefined> {
        const stage = await executableStubRunner.getStage();
        await executableStubRunner.disconnect();
        return stage as T | undefined;
    }
}
