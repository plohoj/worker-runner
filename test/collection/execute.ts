import { ResolvedRunner, RunnerExecuteError, RunnerWasDisconnectedError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { localRunnerResolver, runnerResolver } from 'test/common/promise';
import { runners } from 'test/common/runner-list';
import { rxLocalRunnerResolver, rxRunnerResolver } from 'test/common/rx';
import { ErrorStubRunner } from 'test/common/stubs/error-stub.runner';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from 'test/common/stubs/with-other-instance-stub.runner';
import { each } from 'test/utils/each';
import { errorContaining } from 'test/utils/error-containing';

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
            await expectAsync(withOtherInstanceStubRunner.pullInstanceStage(executableStubRunner))
                .toBeRejectedWith(errorContaining(RunnerWasDisconnectedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_WAS_DISCONNECTED({
                        runnerName: ExecutableStubRunner.name,
                    }),
                    name: RunnerWasDisconnectedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it('with promise', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await expectAsync(executableStubRunner.delay(4)).toBeResolved();
        });

        it ('with exception', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            const exceptionError = 'METHOD_EXCEPTION';
            await expectAsync(errorStubRunner.throwError(exceptionError))
                .toBeRejectedWith(errorContaining(RunnerExecuteError, {
                    message: exceptionError,
                    name: RunnerExecuteError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it ('with stack trace exception', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            const exceptionError = 'METHOD_EXCEPTION';
            await expectAsync(errorStubRunner.throwErrorTrace(exceptionError))
                .toBeRejectedWith(errorContaining(RunnerExecuteError, {
                    message: exceptionError,
                    name: Error.name,
                    stack: jasmine.stringMatching(/throwErrorTrace/),
                }));
        });

        it ('with delay exceptions', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            const exceptionError = 'METHOD_EXCEPTION_DELAY';
            await expectAsync(errorStubRunner.throwErrorInPromise(exceptionError, 6))
                .toBeRejectedWith(errorContaining(RunnerExecuteError, {
                        message: exceptionError,
                        name: RunnerExecuteError.name,
                        stack: jasmine.stringMatching(/.+/),
                    }));
        });

        it ('with delay stack trace exceptions', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            const exceptionError = 'METHOD_EXCEPTION_DELAY';
            await expectAsync(errorStubRunner.throwErrorTraceInPromise(exceptionError, 7))
                .toBeRejectedWith(errorContaining(RunnerExecuteError, {
                    message: exceptionError,
                    name: Error.name,
                    stack: jasmine.stringMatching(/error-stub\.runner\./),
                }));
        });

        it ('not exist runner', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await executableStubRunner.destroy();
            await expectAsync(executableStubRunner.amount(53, 95))
                .toBeRejectedWith(errorContaining(RunnerExecuteError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_WAS_DISCONNECTED({
                        runnerName: ExecutableStubRunner.name,
                    }),
                    name: RunnerExecuteError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });
    }),
);

