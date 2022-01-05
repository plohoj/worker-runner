import { JsonObject, ResolvedRunner } from '@worker-runner/core';
import { RunnerResolverLocal } from '@worker-runner/promise';
import { runners } from '../runner-list';
import { ExecutableStubRunner } from './executable-stub.runner';

export class WithLocalResolverStub<T extends JsonObject> {
    private localResolver?: RunnerResolverLocal<typeof runners>;
    private localExecutableStubRunner?: ResolvedRunner<ExecutableStubRunner<T>>;

    public async run(data: T): Promise<void> {
        this.localResolver = new RunnerResolverLocal({runners});
        await this.localResolver.run();
        this.localExecutableStubRunner = await this.localResolver
            .resolve(ExecutableStubRunner, data) as ResolvedRunner<ExecutableStubRunner<T>>;
    }

    public async resolveExecutableRunnerWithoutMarkForTransfer(): Promise<ResolvedRunner<ExecutableStubRunner<T>>> {
        if (!this.localExecutableStubRunner) {
            throw new Error('RunnerResolverLocal is not running');
        }
        return this.localExecutableStubRunner;
    }

    public async resolveExecutableRunnerWithMarkForTransfer(): Promise<ResolvedRunner<ExecutableStubRunner<T>>> {
        const executableStubRunner = await this.resolveExecutableRunnerWithoutMarkForTransfer();
        return executableStubRunner.markForTransfer();
    }

    public async destroy(): Promise<void> {
        return this.localResolver?.destroy();
    }
}
