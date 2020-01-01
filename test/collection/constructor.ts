import { IRunnerError, ResolveRunner, RunnerErrorCode, RunnerErrorMessages } from '@worker-runner/core';
import { rxRunnerResolver } from 'test/common/rx';
import { ErrorStubRunner } from 'test/common/stubs/error-stub.runner';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { ExtendedStubRunner } from 'test/common/stubs/extended-stub.runner';
import { each } from 'test/utils/each';
import { devRunnerResolver, runnerResolver } from '../common/promise';

each({
        Common: runnerResolver,
        Dev: devRunnerResolver,
        Rx: rxRunnerResolver as any as typeof runnerResolver,
    },
    (mode, resolver) => describe(`${mode} constructor`, () => {
        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            resolver.destroy();
        });

        it ('with arguments', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const executableStubRunner: ResolveRunner<ExecutableStubRunner<any>> = await resolver
                .resolve(ExecutableStubRunner, storageData);
            await expectAsync(executableStubRunner.getStage()).toBeResolvedTo(storageData);
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
                    errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_ERROR,
                } as IRunnerError));
        });

        it ('not exist', async () => {
            // @ts-ignore
            await expectAsync(resolver.resolve(class {})).toBeRejectedWith({
                error: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
                errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND,
            } as IRunnerError);
        });
    }),
);

