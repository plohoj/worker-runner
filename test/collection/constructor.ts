import { ResolvedRunner, RunnerNotFound, ConnectionWasClosedError, WORKER_RUNNER_ERROR_MESSAGES, RunnerInitError } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { resolverList } from '../common/resolver-list';
import { EXECUTABLE_STUB_RUNNER_TOKEN, runners } from '../common/runner-list';
import { ErrorStubRunner } from '../common/stubs/error-stub.runner';
import { ExecutableStubRunner } from '../common/stubs/executable-stub.runner';
import { ExtendedStubRunner } from '../common/stubs/extended-stub.runner';
import { WithOtherInstanceStubRunner } from '../common/stubs/with-other-instance-stub.runner';
import { each } from '../utils/each';
import { errorContaining } from '../utils/error-containing';

each(resolverList, (mode, resolver) =>
    describe(`${mode} constructor`, () => {
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
                .resolve(ExecutableStubRunner, storageData) as ResolvedRunner<
                    ExecutableStubRunner<typeof storageData>>;
            await expectAsync(executableStubRunner.getStage()).toBeResolvedTo(storageData);
        });

        it ('with arguments by token', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const executableStubRunner = await resolver
                .resolve(EXECUTABLE_STUB_RUNNER_TOKEN, storageData) as ResolvedRunner<
                    ExecutableStubRunner<typeof storageData>>;
            await expectAsync(executableStubRunner.getStage()).toBeResolvedTo(storageData);
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
                .resolve(ExecutableStubRunner, storageData) as ResolvedRunner<
                    ExecutableStubRunner<typeof storageData>>;
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner) as ResolvedRunner<
                    WithOtherInstanceStubRunner<typeof storageData>>;
            await expectAsync(withOtherInstanceStubRunner.getInstanceStage()).toBeResolvedTo(storageData);
            await localResolver.destroy();
        });

        it ('with destroyed Resolved Runner in arguments', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await executableStubRunner.destroy();
            await expectAsync(resolver.resolve(WithOtherInstanceStubRunner, executableStubRunner))
                .toBeRejectedWith(errorContaining(ConnectionWasClosedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    name: ConnectionWasClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it('with extended class', async () => {
            const executableStubRunner = await resolver.resolve(ExtendedStubRunner);
            await expectAsync(executableStubRunner.amount(7, 35)).toBeResolvedTo(42);
        });

        it ('with exception', async () => {
            const errorMessage = 'Constructor Error';
            await expectAsync(resolver.resolve(ErrorStubRunner, errorMessage))
                .toBeRejectedWith(errorContaining(RunnerInitError, {
                    message: errorMessage,
                    name: RunnerInitError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it ('not exist', async () => {
            class AnonymRunner {}
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            await expectAsync(resolver.resolve(AnonymRunner)).toBeRejectedWith(errorContaining(RunnerNotFound, {
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({runnerName: AnonymRunner.name}),
                name: RunnerNotFound.name,
                stack: jasmine.stringMatching(/.+/),
            }));
        });

        it ('not exist by token', async () => {
            const token = 'NotExistRunnerToken';
            await expectAsync(resolver.resolve(token)).toBeRejectedWith(errorContaining(RunnerNotFound, {
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({ token }),
                name: RunnerNotFound.name,
                stack: jasmine.stringMatching(/.+/),
            }));
        });
    }),
);
