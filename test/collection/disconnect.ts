import { IRunnerError, ResolveRunner, RunnerErrorCode, RunnerErrorMessages } from '@worker-runner/core';
import { devRunnerResolver, runnerResolver } from 'test/common/promise';
import { rxDevRunnerResolver, rxRunnerResolver } from 'test/common/rx';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from 'test/common/stubs/with-other-instance-stub.runner';
import { each } from 'test/utils/each';

each({
        Common: runnerResolver,
        Dev: devRunnerResolver,
        Rx: rxRunnerResolver as any as typeof runnerResolver,
        'Rx Dev': rxDevRunnerResolver as any as typeof devRunnerResolver,
    },
    (mode, resolver) => describe(`${mode} disconnect runner`, () => {

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it ('with instance in arguments', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner, storageData) as ResolveRunner<
                    ExecutableStubRunner<typeof storageData>>;
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner) as ResolveRunner<
                    WithOtherInstanceStubRunner<typeof storageData>>;
            await executableStubRunner.disconnect();
            await expectAsync(withOtherInstanceStubRunner.getInstanceStage())
                .toBeResolvedTo(storageData);
        });

        it ('after disconnect', async () => {
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner) as ResolveRunner<ExecutableStubRunner>;
            await executableStubRunner.disconnect();
            await expectAsync(executableStubRunner.disconnect()).toBeRejectedWith(jasmine.objectContaining({
                message: RunnerErrorMessages.RUNNER_NOT_INIT,
                errorCode: RunnerErrorCode.RUNNER_NOT_INIT,
            } as IRunnerError));
        });

        it ('after destroy', async () => {
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner) as ResolveRunner<ExecutableStubRunner>;
            await executableStubRunner.destroy();
            await expectAsync(executableStubRunner.disconnect()).toBeRejectedWith(jasmine.objectContaining({
                message: RunnerErrorMessages.RUNNER_NOT_INIT,
                errorCode: RunnerErrorCode.RUNNER_NOT_INIT,
            } as IRunnerError));
        });

    }),
);

