import { ResolvedRunner, ConnectionWasClosedError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { localResolvers, resolverList } from '../client/resolver-list';
import { ExecutableStubRunner, EXECUTABLE_STUB_RUNNER_TOKEN } from '../common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from '../common/stubs/with-other-instance-stub.runner';
import { each } from '../utils/each';
import { errorContaining } from '../utils/error-containing';

each(resolverList, (mode, resolver) =>
    describe(`${mode} disconnect runner`, () => {

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it ('with Resolved Runner in arguments', async () => {
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

        it ('after disconnect', async () => {
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner) as ResolvedRunner<ExecutableStubRunner>;
            await executableStubRunner.disconnect();
            await expectAsync(executableStubRunner.disconnect())
                .toBeRejectedWith(errorContaining(ConnectionWasClosedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    name: ConnectionWasClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it ('after destroy', async () => {
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner) as ResolvedRunner<ExecutableStubRunner>;
            await executableStubRunner.destroy();
            await expectAsync(executableStubRunner.disconnect())
                .toBeRejectedWith(errorContaining(ConnectionWasClosedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    name: ConnectionWasClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

    }),
);

each(localResolvers, (mode, IterateLocalRunnerResolver) =>
    describe(`${mode} disconnect runner`, () => {
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
            await withOtherInstanceStubRunner.disconnect();
            expect(runnerEnvironment?.['runnerControllerCollection'].runnerControllers.size).toBe(0);

            await localResolver.destroy();
        });
    }),
);
