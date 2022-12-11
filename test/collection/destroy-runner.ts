import { ConnectionClosedError, RunnerDefinitionCollection, RunnerDestroyError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { localResolversConstructors, allResolvers } from '../client/resolver-list';
import { ErrorStubRunner } from '../common/stubs/error-stub.runner';
import { ExecutableStubRunner, EXECUTABLE_STUB_RUNNER_TOKEN } from '../common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from '../common/stubs/with-other-instance-stub.runner';
import { each } from '../utils/each';
import { errorContaining } from '../utils/error-containing';

each(allResolvers, (mode, resolver) =>
    describe(`${mode} destroy runner:`, () => {

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('simple', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const destroyData = await executableStubRunner.destroy();
            expect(destroyData).toBe(undefined);
        });

        it('should throw an error that occurred during Runner destroying', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);

            const destroyPromise$ = errorStubRunner.destroy();

            await expectAsync(destroyPromise$).toBeRejectedWith(errorContaining(RunnerDestroyError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR({
                    token: RunnerDefinitionCollection.generateTokenForRunnerConstructor(ErrorStubRunner),
                    runnerName: ErrorStubRunner.name,
                }),
                stack: jasmine.stringMatching(/.+/),
                originalErrors: [errorContaining(Error, {
                    message: 'DESTROY_EXCEPTION',
                    name: Error.name,
                    stack: jasmine.stringMatching(/.+/),
                })],
            }));
        });

        it('which is used', async () => {
            const executableStubRunner = await resolver .resolve(ExecutableStubRunner);
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner);

            await executableStubRunner.destroy();

            await expectAsync(withOtherInstanceStubRunner.getInstanceStage())
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    name: ConnectionClosedError.name,
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it('that has already been destroyed', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);

            await executableStubRunner.destroy();

            await expectAsync(executableStubRunner.destroy())
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    name: ConnectionClosedError.name,
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    stack: jasmine.stringMatching(/.+/),
                }));
        });
    }),
);

each(localResolversConstructors, (mode, IterateRunnerResolverLocal) =>
    describe(`${mode} destroy runner:`, () => {
        it('should call the overridden destroy method during destroying of the Runner ', async () => {
            class DestroyableRunner {
                public destroy(): void {
                    // stub
                }
            }
            const destroySpy = spyOn(DestroyableRunner.prototype, 'destroy');
            const localResolver = new IterateRunnerResolverLocal({ runners: [DestroyableRunner] });
            localResolver.run();
            const destroyableRunner = await localResolver.resolve(DestroyableRunner);

            await destroyableRunner.destroy();

            expect(destroySpy).toHaveBeenCalled();

            // destroy
            await localResolver.destroy();
        });
        
        it('should not destroy a previously obtained additional Runner during destroying the main Runner', async () => {
            const localResolver = new IterateRunnerResolverLocal({
                runners: [ExecutableStubRunner, WithOtherInstanceStubRunner],
            });
            localResolver.run();
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');

            const executableStubRunner = await localResolver.resolve(ExecutableStubRunner);
            const withOtherInstanceStubRunner = await localResolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner);

            expect(destroySpy).not.toHaveBeenCalled();
            await withOtherInstanceStubRunner.destroy();
            expect(destroySpy).not.toHaveBeenCalled();

            // destroy
            await localResolver.destroy();
        });

        it('should destroy a previously obtained additional Resolved Runner when additional Runner was mark for transfer during destroying the main Runner', async () => {
            const localResolver = new IterateRunnerResolverLocal({
                runners: [ExecutableStubRunner, WithOtherInstanceStubRunner],
            });
            localResolver.run();
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');

            const executableStubRunner = await localResolver.resolve(ExecutableStubRunner);
            const withOtherInstanceStubRunner = await localResolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner.markForTransfer());

            expect(destroySpy).not.toHaveBeenCalled();
            await withOtherInstanceStubRunner.destroy();
            expect(destroySpy).toHaveBeenCalledOnceWith();

            // destroy
            await localResolver.destroy();
        });
    }),
);
