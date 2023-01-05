import { ConnectionClosedError, ResolvedRunner, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { each } from '../client/utils/each';
import { errorContaining } from '../client/utils/error-containing';
import { pickResolverFactories } from '../client/utils/pick-resolver-factories';
import { ExecutableStubRunner, EXECUTABLE_STUB_RUNNER_TOKEN } from '../common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from '../common/stubs/with-other-instance-stub.runner';

each(pickResolverFactories(), (mode, resolverFactory) =>
    describe(`${mode} disconnect runner`, () => {
        const resolver = resolverFactory();

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('with Resolved Runner in arguments', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner, storageData) as ResolvedRunner<
                    ExecutableStubRunner<typeof storageData>>;
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner) as ResolvedRunner<
                    WithOtherInstanceStubRunner<typeof storageData>>;
            await executableStubRunner.disconnect();
            await expectAsync(withOtherInstanceStubRunner.getInstanceStage())
                .toBeResolvedTo(storageData);
        });

        it('after disconnect', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await executableStubRunner.disconnect();
            await expectAsync(executableStubRunner.disconnect())
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    name: ConnectionClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it('after destroy', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await executableStubRunner.destroy();
            await expectAsync(executableStubRunner.disconnect())
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    name: ConnectionClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });
    }),
);

each(pickResolverFactories('Local'), (mode, resolverFactory) =>
    describe(`${mode} disconnect runner:`, () => {
        const resolver = resolverFactory();

        beforeAll(() => {
            resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('should not destroy a previously obtained additional Runner during disconnecting the main Runner', async () => {
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');

            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner);

            expect(destroySpy).not.toHaveBeenCalled();
            await withOtherInstanceStubRunner.disconnect();
            expect(destroySpy).not.toHaveBeenCalled();
        });

        it('should destroy a previously obtained additional Resolved Runner when additional Runner was mark for transfer during disconnecting the main Runner', async () => {
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');

            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner.markForTransfer());

            expect(destroySpy).not.toHaveBeenCalled();
            await withOtherInstanceStubRunner.disconnect();
            expect(destroySpy).toHaveBeenCalledOnceWith();
        });
    }),
);
