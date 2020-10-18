import { LocalRunnerResolver } from '@worker-runner/promise';
import { RxLocalRunnerResolver } from '@worker-runner/rx';
import { runners } from 'test/common/runner-list';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from 'test/common/stubs/with-other-instance-stub.runner';
import { each } from 'test/utils/each';

each({
    Local: LocalRunnerResolver,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'Rx Local': RxLocalRunnerResolver as any as typeof LocalRunnerResolver,
},
(mode, IterateLocalRunnerResolver) => describe(`${mode} wrap runner`, () => {
    it ('after disconnect', async () => {
        const storageData = {
            id: 5326,
            type: 'STORAGE_DATA',
        };
        const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');
        const localResolver = new IterateLocalRunnerResolver({ runners });
        await localResolver.run();
        const executableStubRunner = new ExecutableStubRunner(storageData);
        const resolvedExecutableStubRunner = await localResolver.wrapRunner(executableStubRunner);
        const withOtherInstanceResolverStub = new WithOtherInstanceStubRunner();
        const resolvedWithOtherInstanceResolverStub = await localResolver.wrapRunner(withOtherInstanceResolverStub);
        await expectAsync(resolvedWithOtherInstanceResolverStub.pullInstanceStage(resolvedExecutableStubRunner))
            .toBeResolved(storageData);
        expect(destroySpy).not.toHaveBeenCalled();
        resolvedWithOtherInstanceResolverStub.destroy();
        expect(destroySpy).not.toHaveBeenCalled();
        await resolvedExecutableStubRunner.disconnect();
        expect(destroySpy).toHaveBeenCalled();
        await localResolver.destroy();
    });

    it ('after destroy', async () => {
        const storageData = {
            id: 5326,
            type: 'STORAGE_DATA',
        };
        const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');
        const localResolver = new IterateLocalRunnerResolver({ runners });
        await localResolver.run();
        const executableStubRunner = new ExecutableStubRunner(storageData);
        const resolvedExecutableStubRunner = await localResolver.wrapRunner(executableStubRunner);
        const withOtherInstanceResolverStub = new WithOtherInstanceStubRunner();
        const resolvedWithOtherInstanceResolverStub = await localResolver.wrapRunner(withOtherInstanceResolverStub);
        await expectAsync(resolvedWithOtherInstanceResolverStub.pullInstanceStage(resolvedExecutableStubRunner))
            .toBeResolved(storageData);
        expect(destroySpy).not.toHaveBeenCalled();
        resolvedWithOtherInstanceResolverStub.destroy();
        expect(destroySpy).not.toHaveBeenCalled();
        await resolvedExecutableStubRunner.destroy();
        expect(destroySpy).toHaveBeenCalled();
        await localResolver.destroy();
    });
}),
);
