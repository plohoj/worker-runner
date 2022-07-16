import { JsonLike, ResolvedRunner } from '@worker-runner/core';
import { RunnerResolverLocal } from '@worker-runner/promise';
import { runners } from '../runner-list';
import { ExecutableStubRunner } from './executable-stub.runner';

export class WithLocalResolverStub<T extends JsonLike> {
    private localResolver?: RunnerResolverLocal<typeof runners>;
    private localExecutableStubRunner?: ResolvedRunner<ExecutableStubRunner<T>>;

    public async run(data: T): Promise<void> {
        this.localResolver = new RunnerResolverLocal({runners});
        this.localResolver.run();
        this.localExecutableStubRunner = await this.localResolver
            .resolve(ExecutableStubRunner, data) as ResolvedRunner<ExecutableStubRunner<T>>;
    }

    public resolveExecutableRunnerWithoutMarkForTransfer(): ResolvedRunner<ExecutableStubRunner<T>> {
        if (!this.localExecutableStubRunner) {
            throw new Error('RunnerResolverLocal is not running');
        }
        return this.localExecutableStubRunner;
    }

    public resolveExecutableRunnerWithMarkForTransfer(): ResolvedRunner<ExecutableStubRunner<T>> {
        const executableStubRunner = this.resolveExecutableRunnerWithoutMarkForTransfer();
        return executableStubRunner.markForTransfer();
    }

    public async destroy(): Promise<void> {
        return this.localResolver?.destroy();
    }
}
