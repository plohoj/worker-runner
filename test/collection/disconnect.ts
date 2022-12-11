import { ResolvedRunner, ConnectionClosedError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { localResolversConstructors, allResolvers } from '../client/resolver-list';
import { ExecutableStubRunner, EXECUTABLE_STUB_RUNNER_TOKEN } from '../common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from '../common/stubs/with-other-instance-stub.runner';
import { each } from '../utils/each';
import { errorContaining } from '../utils/error-containing';

each(allResolvers, (mode, resolver) =>
    describe(`${mode} disconnect runner`, () => {

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

each(localResolversConstructors, (mode, IterateRunnerResolverLocal) =>
    describe(`${mode} disconnect runner:`, () => {
        it('should not destroy a previously obtained additional Runner during disconnecting the main Runner', async () => {
            const localResolver = new IterateRunnerResolverLocal({
                runners: [ExecutableStubRunner, WithOtherInstanceStubRunner],
            });
            localResolver.run();
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');

            const executableStubRunner = await localResolver.resolve(ExecutableStubRunner);
            const withOtherInstanceStubRunner = await localResolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner);

            expect(destroySpy).not.toHaveBeenCalled();
            await withOtherInstanceStubRunner.disconnect();
            expect(destroySpy).not.toHaveBeenCalled();

            // destroy
            await localResolver.destroy();
        });

        it('should destroy a previously obtained additional Resolved Runner when additional Runner was mark for transfer during disconnecting the main Runner', async () => {
            const localResolver = new IterateRunnerResolverLocal({
                runners: [ExecutableStubRunner, WithOtherInstanceStubRunner],
            });
            localResolver.run();
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');

            const executableStubRunner = await localResolver.resolve(ExecutableStubRunner);
            const withOtherInstanceStubRunner = await localResolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner.markForTransfer());

            expect(destroySpy).not.toHaveBeenCalled();
            await withOtherInstanceStubRunner.disconnect();
            expect(destroySpy).toHaveBeenCalledOnceWith();

            // destroy
            await localResolver.destroy();
        });
    }),
);
