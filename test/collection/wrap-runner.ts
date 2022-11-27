import { localResolversConstructors } from '../client/resolver-list';
import { runners } from '../common/runner-list';
import { ExecutableStubRunner } from '../common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from '../common/stubs/with-other-instance-stub.runner';
import { each } from '../utils/each';

each(localResolversConstructors, (mode, IterateRunnerResolverLocal) =>
    describe(`${mode} wrap runner:`, () => {
        it('after disconnect', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');
            const localResolver = new IterateRunnerResolverLocal({ runners });
            localResolver.run();
            const executableStubRunner = new ExecutableStubRunner(storageData);
            const resolvedExecutableStubRunner = localResolver.wrapRunner(executableStubRunner);
            const withOtherInstanceResolverStub = new WithOtherInstanceStubRunner();
            const resolvedWithOtherInstanceResolverStub = localResolver.wrapRunner(withOtherInstanceResolverStub);
            await expectAsync(resolvedWithOtherInstanceResolverStub.pullInstanceStage(resolvedExecutableStubRunner))
                .toBeResolved(storageData);
            expect(destroySpy).not.toHaveBeenCalled();
            await resolvedWithOtherInstanceResolverStub.destroy();
            expect(destroySpy).not.toHaveBeenCalled();
            await resolvedExecutableStubRunner.disconnect();
            expect(destroySpy).toHaveBeenCalled();
            await localResolver.destroy();
        });

        it('after destroy', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');
            const localResolver = new IterateRunnerResolverLocal({ runners });
            localResolver.run();
            const executableStubRunner = new ExecutableStubRunner(storageData);
            const resolvedExecutableStubRunner = localResolver.wrapRunner(executableStubRunner);
            const withOtherInstanceResolverStub = new WithOtherInstanceStubRunner();
            const resolvedWithOtherInstanceResolverStub = localResolver.wrapRunner(withOtherInstanceResolverStub);
            await expectAsync(resolvedWithOtherInstanceResolverStub.pullInstanceStage(resolvedExecutableStubRunner))
                .toBeResolved(storageData);
            expect(destroySpy).not.toHaveBeenCalled();
            await resolvedWithOtherInstanceResolverStub.destroy();
            expect(destroySpy).not.toHaveBeenCalled();
            await resolvedExecutableStubRunner.destroy();
            expect(destroySpy).toHaveBeenCalled();
            await localResolver.destroy();
        });

        it('should wrap Runner without configuration', async () => {
            const helloMessage = 'Hello';
            const runnerSub = new class RunnerStub {
                public getHelloMessage() {
                    return helloMessage;
                }
            }
            const localResolver = new IterateRunnerResolverLocal();
            localResolver.run();

            const resolvedRunnerSub = localResolver.wrapRunner(runnerSub);
            await expectAsync(resolvedRunnerSub.getHelloMessage()).toBeResolvedTo(helloMessage)

            await localResolver.destroy();
        });
    }),
);
