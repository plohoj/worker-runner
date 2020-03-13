import { ResolveRunner } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { RxLocalRunnerResolver } from '@worker-runner/rx';
import { localRunnerResolver, runnerResolver } from 'test/common/promise';
import { runners } from 'test/common/runner-list';
import { rxLocalRunnerResolver, rxRunnerResolver } from 'test/common/rx';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { WithLocalResolverStub } from 'test/common/stubs/with-local-resolver-stub.runner';
import { each } from 'test/utils/each';

each({
        Common: runnerResolver,
        Local: localRunnerResolver,
        Rx: rxRunnerResolver as any as typeof runnerResolver,
        'Rx Local': rxLocalRunnerResolver as any as typeof localRunnerResolver,
    },
    (mode, resolver) => describe(`${mode} return Resolved Runner`, () => {

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it ('without mark for transfer', async () => {
            const storageData = {
                id: 4326,
                type: 'STORAGE_DATA',
            };
            const withLocalResolverStub = await resolver
                .resolve(WithLocalResolverStub) as ResolveRunner<WithLocalResolverStub<typeof storageData>>;
            await withLocalResolverStub.run(storageData);
            const executableStubRunner = await withLocalResolverStub.resolveExecutableRunnerWithoutMarkForTransfer();
            await expectAsync(executableStubRunner.getStage()).toBeResolvedTo(storageData);
        });
    }),
);

each({
        Local: LocalRunnerResolver,
        'Rx Local': RxLocalRunnerResolver as any as typeof LocalRunnerResolver,
    },
    (mode, IterateLocalRunnerResolver) => describe(`${mode} return resolved runner`, () => {
        it ('with mark for transfer and disconnect', async () => {
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');
            const localResolver = new IterateLocalRunnerResolver({ runners });
            await localResolver.run();
            const withLocalResolverStub = await localResolver
                .resolve(WithLocalResolverStub) as ResolveRunner<WithLocalResolverStub<any>>;
            await withLocalResolverStub.run({});
            const executableStubRunner = await withLocalResolverStub.resolveExecutableRunnerWithMarkForTransfer();
            expect(destroySpy).not.toHaveBeenCalled();
            await executableStubRunner.disconnect();
            expect(destroySpy).toHaveBeenCalled();
            localResolver.destroy();
        });

        it ('without mark for transfer and disconnect', async () => {
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');
            const localResolver = new IterateLocalRunnerResolver({ runners });
            await localResolver.run();
            const withLocalResolverStub = await localResolver
                .resolve(WithLocalResolverStub) as ResolveRunner<WithLocalResolverStub<any>>;
            await withLocalResolverStub.run({});
            const executableStubRunner = await withLocalResolverStub.resolveExecutableRunnerWithoutMarkForTransfer();
            expect(destroySpy).not.toHaveBeenCalled();
            await executableStubRunner.disconnect();
            expect(destroySpy).not.toHaveBeenCalled();
            await localResolver.destroy();
            expect(destroySpy).toHaveBeenCalled();
        });
    }),
);
