import { ResolvedRunner } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { RxLocalRunnerResolver } from '@worker-runner/rx';
import { resolverList } from '../client/resolver-list';
import { runners } from '../common/runner-list';
import { ExecutableStubRunner } from '../common/stubs/executable-stub.runner';
import { WithLocalResolverStub } from '../common/stubs/with-local-resolver-stub.runner';
import { each } from '../utils/each';

each(resolverList, (mode, resolver) =>
    describe(`${mode} return Resolved Runner`, () => {

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
                .resolve(WithLocalResolverStub) as ResolvedRunner<WithLocalResolverStub<typeof storageData>>;
            await withLocalResolverStub.run(storageData);
            const executableStubRunner = await withLocalResolverStub.resolveExecutableRunnerWithoutMarkForTransfer();
            await expectAsync(executableStubRunner.getStage()).toBeResolvedTo(storageData);
        });
    }),
);

each({
        Local: LocalRunnerResolver,
        'Rx Local': RxLocalRunnerResolver as unknown as typeof LocalRunnerResolver,
    },
    (mode, IterateLocalRunnerResolver) => describe(`${mode} return resolved runner`, () => {
        it ('with mark for transfer and disconnect', async () => {
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');
            const localResolver = new IterateLocalRunnerResolver({ runners });
            await localResolver.run();
            const withLocalResolverStub = await localResolver
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .resolve(WithLocalResolverStub) as ResolvedRunner<WithLocalResolverStub<any>>;
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .resolve(WithLocalResolverStub) as ResolvedRunner<WithLocalResolverStub<any>>;
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
