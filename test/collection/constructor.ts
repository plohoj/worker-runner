import { IRunnerError, ResolveRunner, RunnerErrorCode, RunnerErrorMessages } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { runners } from 'test/common/runner-list';
import { rxLocalRunnerResolver, rxRunnerResolver } from 'test/common/rx';
import { ErrorStubRunner } from 'test/common/stubs/error-stub.runner';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { ExtendedStubRunner } from 'test/common/stubs/extended-stub.runner';
import { WithOtherInstanceStubRunner } from 'test/common/stubs/with-other-instance-stub.runner';
import { each } from 'test/utils/each';
import { localRunnerResolver, runnerResolver } from '../common/promise';

each({
        Common: runnerResolver,
        Local: localRunnerResolver,
        Rx: rxRunnerResolver as any as typeof runnerResolver,
        'Rx Local': rxLocalRunnerResolver as any as typeof localRunnerResolver,
    },
    (mode, resolver) => describe(`${mode} constructor`, () => {
        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it ('with arguments', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner, storageData) as ResolveRunner<
                    ExecutableStubRunner<typeof storageData>>;
            await expectAsync(executableStubRunner.getStage()).toBeResolvedTo(storageData);
        });

        it ('with Resolved Runner in arguments', async () => {
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
            await expectAsync(withOtherInstanceStubRunner.getInstanceStage()).toBeResolvedTo(storageData);
        });

        it ('with Resolved Runner in arguments from another resolver', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const localResolver =  new LocalRunnerResolver({ runners });
            await localResolver.run();
            const executableStubRunner = await localResolver
                .resolve(ExecutableStubRunner, storageData) as ResolveRunner<
                    ExecutableStubRunner<typeof storageData>>;
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner) as ResolveRunner<
                    WithOtherInstanceStubRunner<typeof storageData>>;
            await expectAsync(withOtherInstanceStubRunner.getInstanceStage()).toBeResolvedTo(storageData);
            await localResolver.destroy();
        });

        it ('with destroyed Resolved Runner in arguments', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await executableStubRunner.destroy();
            await expectAsync(resolver.resolve(WithOtherInstanceStubRunner, executableStubRunner)).toBeRejectedWith(
                jasmine.objectContaining({
                    errorCode: RunnerErrorCode.RUNNER_NOT_INIT,
                    message: RunnerErrorMessages.RUNNER_NOT_INIT,
                } as IRunnerError));
        });

        it('with extended class', async () => {
            const executableStubRunner = await resolver.resolve(ExtendedStubRunner);
            await expectAsync(executableStubRunner.amount(7, 35)).toBeResolvedTo(42);
        });

        it ('with exception', async () => {
            const errorMessage = 'Constructor Error';
            await expectAsync(resolver.resolve(ErrorStubRunner, errorMessage)).toBeRejectedWith(
                jasmine.objectContaining({
                    error: errorMessage,
                    errorCode: RunnerErrorCode.RUNNER_INIT_ERROR,
                } as IRunnerError));
        });

        it ('not exist', async () => {
            // @ts-ignore
            await expectAsync(resolver.resolve(class {})).toBeRejectedWith(jasmine.objectContaining({
                message: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
                errorCode: RunnerErrorCode.RUNNER_INIT_ERROR,
            } as IRunnerError));
        });
    }),
);
