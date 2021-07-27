import { ResolvedRunner, RunnerNotFound, ConnectionWasClosedError, WORKER_RUNNER_ERROR_MESSAGES, RunnerInitError } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { apartHostClientResolvers, clientResolverList, resolverList } from '../client/resolver-list';
import { runners } from '../common/runner-list';
import { ErrorStubRunner } from '../common/stubs/error-stub.runner';
import { ExecutableStubRunner, EXECUTABLE_STUB_RUNNER_TOKEN } from '../common/stubs/executable-stub.runner';
import { ExtendedStubRunner, EXTENDED_STUB_RUNNER_TOKEN } from '../common/stubs/extended-stub.runner';
import { WithOtherInstanceStubRunner } from '../common/stubs/with-other-instance-stub.runner';
import { createApartClientHostResolvers } from '../utils/apart-client-host-resolvers';
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
                id: 186,
                type: 'STORAGE_DATA',
            };
            const executableStubRunner = await resolver
                .resolve(EXECUTABLE_STUB_RUNNER_TOKEN, storageData) as ResolvedRunner<
                    ExecutableStubRunner<typeof storageData>>;
            await expectAsync(executableStubRunner.getStage()).toBeResolvedTo(storageData);
        });

        it ('with Resolved Runner in arguments', async () => {
            const storageData = {
                id: 675,
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

each(clientResolverList, (mode, resolver) =>
    describe(`${mode} constructor`, () => {
        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('with soft token configured', async () => {
            const executableStubRunner = await resolver.resolve(EXTENDED_STUB_RUNNER_TOKEN);
            await expectAsync(executableStubRunner.amount(7, 35)).toBeResolvedTo(42);
        });
    }),
);

each(apartHostClientResolvers, (mode, resolvers) => 
    describe(`${mode} constructor`, () => {
        it ('by token without Client configuration', async () => {
            const apartConfiguredLocalRunnerResolvers = createApartClientHostResolvers({
                clientConfig: {
                    runners: [], // TODO optional
                },
                hostConfig: {
                    runners: [
                        {
                            token: EXECUTABLE_STUB_RUNNER_TOKEN,
                            runner: ExecutableStubRunner,
                        },
                    ],
                },
                clientResolverConstructor: resolvers.client,
                hostResolverConstructor: resolvers.host,
            });
            await apartConfiguredLocalRunnerResolvers.run();

            await expectAsync(
                 // TODO can be resolved by constructor
                apartConfiguredLocalRunnerResolvers.client.resolve(EXECUTABLE_STUB_RUNNER_TOKEN)
            ).toBeResolved();

            await apartConfiguredLocalRunnerResolvers.destroy();
        });
    }),
);
