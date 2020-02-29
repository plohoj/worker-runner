import { JsonObject, ResolveRunner } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { runners } from '../runner-list';
import { ExecutableStubRunner } from './executable-stub.runner';

export class WithLocalResolverStub<T extends JsonObject> {
    private localResolver = new LocalRunnerResolver({runners});
    private localExecutableStubRunner?: ResolveRunner<ExecutableStubRunner<T>>;

    public async run(data: T): Promise<void> {
        await this.localResolver.run();
        this.localExecutableStubRunner = await this.localResolver
            .resolve(ExecutableStubRunner, data) as ResolveRunner<ExecutableStubRunner<T>>;
    }

    public async resolveExecutableRunner(): Promise<ResolveRunner<ExecutableStubRunner<T>>> {
        if (!this.localExecutableStubRunner) {
            throw new Error('LocalRunnerResolver not runned');
        }
        return this.localExecutableStubRunner;
    }

    public async resolveExecutableRunnerWithClone(): Promise<ResolveRunner<ExecutableStubRunner<T>>> {
        return await (await this.resolveExecutableRunner()).cloneControl();
    }

    public async destroy(): Promise<void> {
        return this.localResolver.destroy();
    }
}
