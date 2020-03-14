import { IRunnerError, ResolvedRunner, RunnerErrorCode, RunnerErrorMessages } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { localRunnerResolver, runnerResolver } from 'test/common/promise';
import { runners } from 'test/common/runner-list';
import { rxLocalRunnerResolver, rxRunnerResolver } from 'test/common/rx';
import { ErrorStubRunner } from 'test/common/stubs/error-stub.runner';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from 'test/common/stubs/with-other-instance-stub.runner';
import { each } from 'test/utils/each';
import { waitTimeout } from 'test/utils/wait-timeout';

each({
        Common: runnerResolver,
        Local: localRunnerResolver,
        Rx: rxRunnerResolver as any as typeof runnerResolver,
        'Rx Local': rxLocalRunnerResolver as any as typeof localRunnerResolver,
    },
    (mode, resolver) => describe(`${mode} execute`, () => {

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('with arguments', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const result = await executableStubRunner.amount(17, 68);
            expect(result).toBe(85);
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
                .resolve(WithOtherInstanceStubRunner) as ResolvedRunner<
                    WithOtherInstanceStubRunner<typeof storageData>>;
            await expectAsync(withOtherInstanceStubRunner.pullInstanceStage(executableStubRunner))
                .toBeResolvedTo(storageData);
        });

        it ('with Resolved Runner in arguments from another resolver', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const localResolver =  new LocalRunnerResolver({ runners });
            await localResolver.run();
            const executableStubRunner = await localResolver
                .resolve(ExecutableStubRunner, storageData) as ResolvedRunner<
                    ExecutableStubRunner<typeof storageData>>;
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner) as ResolvedRunner<
                    WithOtherInstanceStubRunner<typeof storageData>>;
            await expectAsync(withOtherInstanceStubRunner.pullInstanceStage(executableStubRunner))
                .toBeResolvedTo(storageData);
            await localResolver.destroy();
        });

        it ('with destroyed Resolved Runner in arguments', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await executableStubRunner.destroy();
            const withOtherInstanceStubRunner = await resolver.resolve(WithOtherInstanceStubRunner);
            await expectAsync(withOtherInstanceStubRunner.pullInstanceStage(executableStubRunner)).toBeRejectedWith(
                jasmine.objectContaining({
                    errorCode: RunnerErrorCode.RUNNER_NOT_INIT,
                    message: RunnerErrorMessages.RUNNER_NOT_INIT,
                } as IRunnerError));
        });

        it('with promise', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const delayDuration = 15;
            await waitTimeout(
                expectAsync(executableStubRunner.delay(delayDuration)).toBeResolved(),
                delayDuration + 25,
                delayDuration,
            );
        });

        it ('with exception', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            const exceptionError = 'METHOD_EXCEPTION';
            await expectAsync(errorStubRunner.throwError(exceptionError)).toBeRejectedWith(jasmine.objectContaining({
                error: exceptionError,
                errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
            } as IRunnerError));
        });

        it ('with stack trace exception', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            const exceptionError = 'METHOD_EXCEPTION';
            await expectAsync(errorStubRunner.throwErrorTrace(exceptionError)).toBeRejectedWith(
                jasmine.objectContaining({
                    error: {},
                    errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                    message: exceptionError,
                } as IRunnerError));
        });

        it ('with delay exceptions', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            const exceptionError = 'METHOD_EXCEPTION_DELAY';
            const exceptDelayDuration = 25;
            await waitTimeout(
                expectAsync(errorStubRunner.throwErrorInPromise(exceptionError, exceptDelayDuration))
                    .toBeRejectedWith(jasmine.objectContaining({
                        error: exceptionError,
                        errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                    } as IRunnerError)),
                    exceptDelayDuration + 25,
                    exceptDelayDuration,
                );
        });

        it ('with delay stack trace exceptions', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            const exceptionError = 'METHOD_EXCEPTION_DELAY';
            const exceptDelayDuration = 25;
            await waitTimeout(
                expectAsync(errorStubRunner.throwErrorTraceInPromise(exceptionError, exceptDelayDuration))
                    .toBeRejectedWith(jasmine.objectContaining({
                        error: {},
                        errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                        message: exceptionError,
                    } as IRunnerError)),
                    exceptDelayDuration + 25,
                    exceptDelayDuration,
                );
        });

        it ('not exist runner', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await executableStubRunner.destroy();
            await expectAsync(executableStubRunner.amount(53, 95)).toBeRejectedWith(jasmine.objectContaining({
                message: RunnerErrorMessages.RUNNER_NOT_INIT,
                errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
            } as IRunnerError));
        });
    }),
);

