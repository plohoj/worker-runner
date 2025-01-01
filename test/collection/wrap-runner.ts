import { each } from '../client/utils/each';
import { pickResolverFactories } from '../client/utils/pick-resolver-factories';
import { ExecutableStubRunner } from '../common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from '../common/stubs/with-other-instance-stub.runner';

each(pickResolverFactories('Local'), (mode, resolverFactory) =>
    describe(`${mode} wrap runner:`, () => {
        const resolver = resolverFactory();

        beforeAll(() => {
            resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('should destroy the wrapped Runner argument for the wrapped Runner only once after disconnecting all links', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');
            const executableStubRunner = new ExecutableStubRunner(storageData);
            const resolvedExecutableStubRunner = resolver.wrapRunner(executableStubRunner);
            const withOtherInstanceResolverStub = new WithOtherInstanceStubRunner<typeof storageData>();
            const resolvedWithOtherInstanceResolverStub = resolver.wrapRunner(withOtherInstanceResolverStub);

            await expectAsync(resolvedWithOtherInstanceResolverStub.pullInstanceStage(resolvedExecutableStubRunner))
                .toBeResolvedTo(storageData);

            expect(destroySpy).not.toHaveBeenCalled();
            await resolvedWithOtherInstanceResolverStub.destroy();
            expect(destroySpy).not.toHaveBeenCalled();
            await resolvedExecutableStubRunner.disconnect();
            expect(destroySpy).toHaveBeenCalledOnceWith();
        });

        it('should destroy the wrapped Runner argument for the wrapped Runner only once after destroy original Runner', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');
            const executableStubRunner = new ExecutableStubRunner(storageData);
            const resolvedExecutableStubRunner = resolver.wrapRunner(executableStubRunner);
            const withOtherInstanceResolverStub = new WithOtherInstanceStubRunner<typeof storageData>();
            const resolvedWithOtherInstanceResolverStub = resolver.wrapRunner(withOtherInstanceResolverStub);

            await expectAsync(resolvedWithOtherInstanceResolverStub.pullInstanceStage(resolvedExecutableStubRunner))
                .toBeResolvedTo(storageData);

            expect(destroySpy).not.toHaveBeenCalled();
            await resolvedWithOtherInstanceResolverStub.destroy();
            expect(destroySpy).not.toHaveBeenCalled();
            await resolvedExecutableStubRunner.destroy();
            expect(destroySpy).toHaveBeenCalledOnceWith();
        });

        it('should wrap Runner without configuration', async () => {
            const helloMessage = 'Hello';
            const runnerSub = new class RunnerStub {
                public getHelloMessage() {
                    return helloMessage;
                }
            }

            const resolvedRunnerSub = resolver.wrapRunner(runnerSub);

            await expectAsync(resolvedRunnerSub.getHelloMessage()).toBeResolvedTo(helloMessage)
        });
    }),
);
