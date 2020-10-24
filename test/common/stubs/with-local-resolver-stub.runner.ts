import { JsonObject, ResolvedRunner } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { runners } from '../runner-list';
import { ExecutableStubRunner } from './executable-stub.runner';

export class WithLocalResolverStub<T extends JsonObject> {
    private localResolver?: LocalRunnerResolver<typeof runners>;
    private localExecutableStubRunner?: ResolvedRunner<ExecutableStubRunner<T>>;

    public async run(data: T): Promise<void> {
        this.localResolver = new LocalRunnerResolver({runners});
        await this.localResolver.run();
        this.localExecutableStubRunner = await this.localResolver
            .resolve(ExecutableStubRunner, data) as ResolvedRunner<ExecutableStubRunner<T>>;
    }

    public async resolveExecutableRunnerWithoutMarkForTransfer(): Promise<ResolvedRunner<ExecutableStubRunner<T>>> {
        if (!this.localExecutableStubRunner) {
            throw new Error('LocalRunnerResolver not runned');
        }
        return this.localExecutableStubRunner;
    }

    public async resolveExecutableRunnerWithMarkForTransfer(): Promise<ResolvedRunner<ExecutableStubRunner<T>>> {
        return (await this.resolveExecutableRunnerWithoutMarkForTransfer()).markForTransfer();
    }

    public async destroy(): Promise<void> {
        return this.localResolver?.destroy();
    }
}
