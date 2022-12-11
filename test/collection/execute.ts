import { ConnectionClosedError, ResolvedRunner, RunnerDataTransferError, RunnerExecuteError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { RunnerResolverLocal } from '@worker-runner/promise';
import { allResolvers, apartHostClientResolvers, localResolversConstructors, resolverClientList } from '../client/resolver-list';
import { runners } from '../common/runner-list';
import { ErrorStubRunner } from '../common/stubs/error-stub.runner';
import { ExecutableStubRunner, EXECUTABLE_STUB_RUNNER_TOKEN } from '../common/stubs/executable-stub.runner';
import { EXTENDED_STUB_RUNNER_TOKEN } from '../common/stubs/extended-stub.runner';
import { WithLocalResolverStub } from '../common/stubs/with-local-resolver-stub.runner';
import { WithOtherInstanceStubRunner } from '../common/stubs/with-other-instance-stub.runner';
import { createApartClientHostResolvers } from '../utils/apart-client-host-resolvers';
import { each } from '../utils/each';
import { errorContaining } from '../utils/error-containing';

each(allResolvers, (mode, resolver) =>
    describe(`${mode} execute:`, () => {

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

        it('with Resolved Runner in arguments', async () => {
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

        it('with Resolved Runner in arguments from another resolver', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const localResolver = new RunnerResolverLocal({ runners });
            localResolver.run();
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

        it('should throw an error when the Resolved Runner that was passed as an argument was destroyed before method executing', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const withOtherInstanceStubRunner = await resolver.resolve(WithOtherInstanceStubRunner);

            await executableStubRunner.destroy();
            const request$ = withOtherInstanceStubRunner.pullInstanceStage(executableStubRunner);

            await expectAsync(request$)
                .toBeRejectedWith(errorContaining(RunnerDataTransferError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.DATA_TRANSFER_PREPARATION_ERROR(),
                    name: RunnerDataTransferError.name,
                    stack: jasmine.stringMatching(/.+/),
                    originalErrors: [errorContaining(ConnectionClosedError, {
                        message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                            token: EXECUTABLE_STUB_RUNNER_TOKEN,
                            runnerName: ExecutableStubRunner.name,
                        }),
                        name: ConnectionClosedError.name,
                        stack: jasmine.stringMatching(/.+/),
                    })],
                }));
        });

        it('with promise', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await expectAsync(executableStubRunner.delay(4)).toBeResolved();
        });

        it('with exception', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            const exceptionError = 'METHOD_EXCEPTION';
            await expectAsync(errorStubRunner.throwError(exceptionError))
                .toBeRejectedWith(errorContaining(RunnerExecuteError, {
                    message: exceptionError,
                    name: RunnerExecuteError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
            await errorStubRunner.destroy().catch(() => {
                // Stub
            });
        });

        it('with stack trace exception', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            const exceptionError = 'METHOD_EXCEPTION';
            await expectAsync(errorStubRunner.throwErrorTrace(exceptionError))
                .toBeRejectedWith(errorContaining(Error, {
                    message: exceptionError,
                    name: Error.name,
                    stack: jasmine.stringMatching(/throwErrorTrace/),
                }));
            await errorStubRunner.destroy().catch(() => {
                // Stub
            });
        });

        it('with delay exceptions', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            const exceptionError = 'METHOD_EXCEPTION_DELAY';
            await expectAsync(errorStubRunner.throwErrorInPromise(exceptionError, 6))
                .toBeRejectedWith(errorContaining(RunnerExecuteError, {
                        message: exceptionError,
                        name: RunnerExecuteError.name,
                        stack: jasmine.stringMatching(/.+/),
                    }));
            await errorStubRunner.destroy().catch(() => {
                // Stub
            });
        });

        it('with delay stack trace exceptions', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            const exceptionError = 'METHOD_EXCEPTION_DELAY';
            await expectAsync(errorStubRunner.throwErrorTraceInPromise(exceptionError, 7))
                .toBeRejectedWith(errorContaining(Error, {
                    message: exceptionError,
                    name: Error.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
            await errorStubRunner.destroy().catch(() => {
                // Stub
            });
        });

        it('destroyed runner', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await executableStubRunner.destroy();
            await expectAsync(executableStubRunner.amount(53, 95))
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    name: ConnectionClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it('soft initialized runner', async () => {
            const executableStubRunner = await resolver.resolve(EXTENDED_STUB_RUNNER_TOKEN);
            await expectAsync(executableStubRunner.amount(2, 5)).toBeResolvedTo(7);
        });
    }),
);

each(resolverClientList, (mode, resolver) =>
    describe(`${mode} constructor:`, () => {
        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('should throw an error when the Resolved Runner that was passed as an argument was destroyed during method execution', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const withOtherInstanceStubRunner = await resolver.resolve(WithOtherInstanceStubRunner);

            const executeResponse$ = withOtherInstanceStubRunner.pullInstanceStage(executableStubRunner);
            await executableStubRunner.destroy();

            await expectAsync(executeResponse$).toBeRejectedWith(errorContaining(ConnectionClosedError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                    token: EXECUTABLE_STUB_RUNNER_TOKEN,
                    runnerName: ExecutableStubRunner.name,
                }),
                name: ConnectionClosedError.name,
                stack: jasmine.stringMatching(/.+/),
            }));
        });
    }),
);

each(localResolversConstructors, (mode, IterateRunnerResolverLocal) =>
    describe(`${mode} constructor:`, () => {
        it('should throw an error when the Resolved Runner that was passed as an argument was destroyed during method execution', async () => {
            const localResolver = new IterateRunnerResolverLocal();
            localResolver.run();
            const executableStubRunner = await localResolver.resolve(ExecutableStubRunner);
            const withOtherInstanceStubRunner = await localResolver.resolve(WithOtherInstanceStubRunner);

            const executeResponse$ = withOtherInstanceStubRunner.pullInstanceStage(executableStubRunner);
            await executableStubRunner.destroy();

            await expectAsync(executeResponse$).toBeRejectedWith(errorContaining(RunnerDataTransferError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.DATA_TRANSFER_PREPARATION_ERROR(),
                name: RunnerDataTransferError.name,
                stack: jasmine.stringMatching(/.+/),
                originalErrors: [
                    errorContaining(ConnectionClosedError, {
                        message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                            token: EXECUTABLE_STUB_RUNNER_TOKEN,
                            runnerName: ExecutableStubRunner.name,
                        }),
                        name: ConnectionClosedError.name,
                        stack: jasmine.stringMatching(/.+/),
                    }),
                ],
            }));
        });
    }),
);

each(apartHostClientResolvers, (mode, resolvers) => 
    describe(`${mode} execute`, () => {
        it('with soft runner argument', async () => {
            const apartConfiguredRunnerResolvers = createApartClientHostResolvers({
                clientConfig: {
                    runners: [WithLocalResolverStub],
                },
                hostConfig: {
                    runners: [
                        {
                            token: EXECUTABLE_STUB_RUNNER_TOKEN,
                            runner: ExecutableStubRunner,
                        },
                        WithLocalResolverStub,
                    ],
                },
                runnerResolverClientConstructor: resolvers.client,
                runnerResolverHostConstructor: resolvers.host,
            });
            await apartConfiguredRunnerResolvers.run();
            const withLocalResolverStub = await apartConfiguredRunnerResolvers.client.resolve(WithLocalResolverStub);
            await withLocalResolverStub.run('');

            await expectAsync(
                withLocalResolverStub.resolveExecutableRunnerWithMarkForTransfer()
            ).toBeResolved();

            await apartConfiguredRunnerResolvers.destroy();
        });
    }),
);
