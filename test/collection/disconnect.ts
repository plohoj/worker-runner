import { ResolvedRunner, RunnerWasDisconnectedError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { resolverList } from 'test/common/resolver-list';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from 'test/common/stubs/with-other-instance-stub.runner';
import { each } from 'test/utils/each';
import { errorContaining } from 'test/utils/error-containing';

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
                .toBeRejectedWith(errorContaining(RunnerWasDisconnectedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_WAS_DISCONNECTED({
                        runnerName: ExecutableStubRunner.name,
                    }),
                    name: RunnerWasDisconnectedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it ('after destroy', async () => {
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner) as ResolvedRunner<ExecutableStubRunner>;
            await executableStubRunner.destroy();
            await expectAsync(executableStubRunner.disconnect())
                .toBeRejectedWith(errorContaining(RunnerWasDisconnectedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_WAS_DISCONNECTED({
                        runnerName: ExecutableStubRunner.name,
                    }),
                    name: RunnerWasDisconnectedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

    }),
);

