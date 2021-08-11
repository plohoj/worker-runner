import { ResolvedRunner, RunnerDestroyError, ConnectionWasClosedError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { localResolvers, resolverList } from '../client/resolver-list';
import { ErrorStubRunner } from '../common/stubs/error-stub.runner';
import { ExecutableStubRunner, EXECUTABLE_STUB_RUNNER_TOKEN } from '../common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from '../common/stubs/with-other-instance-stub.runner';
import { each } from '../utils/each';
import { errorContaining } from '../utils/error-containing';

each(resolverList, (mode, resolver) =>
    describe(`${mode} destroy runner`, () => {

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it ('simple', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const destroyData = await executableStubRunner.destroy();
            expect(destroyData).toBe(undefined);
        });

        it ('with exception in method', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            await expectAsync(errorStubRunner.destroy()).toBeRejectedWith(errorContaining(RunnerDestroyError, {
                message: 'DESTROY_EXCEPTION',
                name: Error.name,
                stack: jasmine.stringMatching(/.+/),
            }));
        });

        it ('which is used', async () => {
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner) as ResolvedRunner<ExecutableStubRunner>;
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner) as ResolvedRunner<
                    WithOtherInstanceStubRunner>;

            await executableStubRunner.destroy();

            await expectAsync(withOtherInstanceStubRunner.getInstanceStage())
                .toBeRejectedWith(errorContaining(ConnectionWasClosedError, {
                    name: ConnectionWasClosedError.name,
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it ('that has already been destroyed', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);

            await executableStubRunner.destroy();

            await expectAsync(executableStubRunner.destroy())
                .toBeRejectedWith(errorContaining(ConnectionWasClosedError, {
                    name: ConnectionWasClosedError.name,
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    stack: jasmine.stringMatching(/.+/),
                }));
        });
    }),
);

each(localResolvers, (mode, IterateLocalRunnerResolver) =>
    describe(`${mode} destroy runner`, () => {
        it ('with extended method', async () => {
            class DestroyableRunner {
                public destroy(): void {
                    // stub
                }
            }
            const destroySpy = spyOn(DestroyableRunner.prototype, 'destroy');
            const localResolver = new IterateLocalRunnerResolver({ runners: [DestroyableRunner] });
            await localResolver.run();
            const destroyableRunner = await localResolver.resolve(DestroyableRunner);

            await destroyableRunner.destroy();
            expect(destroySpy).toHaveBeenCalled();

            await localResolver.destroy();
        });

        it ('with resolved another runner', async () => {
            const localResolver = new IterateLocalRunnerResolver({
                runners: [ExecutableStubRunner, WithOtherInstanceStubRunner],
            });
            await localResolver.run();

            const executableStubRunner = await localResolver
                .resolve(ExecutableStubRunner) as ResolvedRunner<ExecutableStubRunner>;
            const withOtherInstanceStubRunner = await localResolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner.markForTransfer()) as ResolvedRunner<
                    WithOtherInstanceStubRunner>;
            const runnerEnvironments
                = [...localResolver['resolverBridge']?.hostRunnerResolver['runnerEnvironments'] || []];

            const runnerEnvironment = runnerEnvironments
                .find(runnerEnvironment => runnerEnvironment.token === WithOtherInstanceStubRunner.name);

            expect(runnerEnvironment?.['runnerControllerCollection'].runnerControllers.size).toBe(1);
            await withOtherInstanceStubRunner.destroy();
            expect(runnerEnvironment?.['runnerControllerCollection'].runnerControllers.size).toBe(0);

            await localResolver.destroy();
        });
    }),
);
