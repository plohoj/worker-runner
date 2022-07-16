import { JsonLike, ResolvedRunner } from '@worker-runner/core';
import { ExecutableStubRunner } from './executable-stub.runner';

export class WithOtherInstanceStubRunner<T extends JsonLike = JsonLike> {

    constructor(private executableStubRunner?: ResolvedRunner<ExecutableStubRunner<T>>) {}

    public getInstanceStage(): Promise<T | undefined> {
        return this.executableStubRunner?.getStage() as Promise<T | undefined>;
    }

    public async pullInstanceStage(
        executableStubRunner: ResolvedRunner<ExecutableStubRunner<T>>,
    ): Promise<T | undefined> {
        const stage = await executableStubRunner.getStage();
        await executableStubRunner.disconnect();
        return stage as T | undefined;
    }
}
