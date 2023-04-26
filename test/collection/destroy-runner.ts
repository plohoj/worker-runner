import { ConnectionClosedError, DisconnectReason, RunnerDefinitionCollection, RunnerDestroyError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { each } from '../client/utils/each';
import { errorContaining } from '../client/utils/error-containing';
import { pickResolverFactories } from '../client/utils/pick-resolver-factories';
import { ErrorStubRunner } from '../common/stubs/error-stub.runner';
import { ExecutableStubRunner, EXECUTABLE_STUB_RUNNER_TOKEN } from '../common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from '../common/stubs/with-other-instance-stub.runner';

each(pickResolverFactories(), (mode, resolverFactory) =>
    describe(`${mode} destroy runner:`, () => {
        const resolver = resolverFactory();

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('should destroy Runner', async () => {
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

        it('should throw an error when calling a method from a second level Runner via a first level Runner, when the second level Runner has already been destroyed', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner);

            await executableStubRunner.destroy();

            await expectAsync(withOtherInstanceStubRunner.getInstanceStage())
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                        disconnectReason: DisconnectReason.RunnerDestroyed,
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    disconnectReason: DisconnectReason.RunnerDestroyed,
                    name: ConnectionClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it('should throw an error when destroying an already destroyed Runner', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);

            await executableStubRunner.destroy();

            await expectAsync(executableStubRunner.destroy())
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                        disconnectReason: DisconnectReason.RunnerDestroyed,
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    disconnectReason: DisconnectReason.RunnerDestroyed,
                    name: ConnectionClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });
    }),
);

each(pickResolverFactories('Local'), (mode, resolverFactory) =>
    describe(`${mode} destroy runner:`, () => {
        const resolver = resolverFactory();

        beforeAll(() => {
            resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('should call the overridden destroy method during destroying of the Runner ', async () => {
            class DestroyableRunner {
                public destroy(): void {
                    // stub
                }
            }
            const destroySpy = spyOn(DestroyableRunner.prototype, 'destroy');
            const destroyableRunner = await resolver.resolve(DestroyableRunner);

            await destroyableRunner.destroy();

            expect(destroySpy).toHaveBeenCalled();
        });
        
        it('should not destroy a previously obtained additional Runner during destroying the main Runner', async () => {
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');

            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner);

            expect(destroySpy).not.toHaveBeenCalled();
            await withOtherInstanceStubRunner.destroy();
            expect(destroySpy).not.toHaveBeenCalled();
        });

        it('should destroy a previously obtained additional Resolved Runner when additional Runner was mark for transfer during destroying the main Runner', async () => {
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');

            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner.markForTransfer());

            expect(destroySpy).not.toHaveBeenCalled();
            await withOtherInstanceStubRunner.destroy();
            expect(destroySpy).toHaveBeenCalledOnceWith();
        });
    }),
);
