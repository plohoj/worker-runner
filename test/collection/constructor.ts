import { ResolvedRunner, RunnerNotFound, ConnectionClosedError, WORKER_RUNNER_ERROR_MESSAGES, RunnerInitError } from '@worker-runner/core';
import { RunnerResolverLocal } from '@worker-runner/promise';
import { apartHostClientResolvers, resolverClientList, localResolversConstructors, allResolvers } from '../client/resolver-list';
import { runners } from '../common/runner-list';
import { ErrorStubRunner } from '../common/stubs/error-stub.runner';
import { ExecutableStubRunner, EXECUTABLE_STUB_RUNNER_TOKEN } from '../common/stubs/executable-stub.runner';
import { ExtendedStubRunner, EXTENDED_STUB_RUNNER_TOKEN } from '../common/stubs/extended-stub.runner';
import { WithOtherInstanceStubRunner } from '../common/stubs/with-other-instance-stub.runner';
import { createApartClientHostResolvers } from '../utils/apart-client-host-resolvers';
import { each } from '../utils/each';
import { errorContaining } from '../utils/error-containing';

each(allResolvers, (mode, resolver) =>
    describe(`${mode} constructor`, () => {
        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('with arguments', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner, storageData) as ResolvedRunner<
                    ExecutableStubRunner<typeof storageData>>;
            await expectAsync(executableStubRunner.getStage()).toBeResolvedTo(storageData);
        });

        it('with arguments by token', async () => {
            const storageData = {
                id: 186,
                type: 'STORAGE_DATA',
            };
            const executableStubRunner = await resolver
                .resolve(EXECUTABLE_STUB_RUNNER_TOKEN, storageData) as ResolvedRunner<
                    ExecutableStubRunner<typeof storageData>>;
            await expectAsync(executableStubRunner.getStage()).toBeResolvedTo(storageData);
        });

        it('with Resolved Runner in arguments', async () => {
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

        it('with Resolved Runner in arguments from another resolver', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const localResolver =  new RunnerResolverLocal({ runners });
            localResolver.run();
            const executableStubRunner = await localResolver
                .resolve(ExecutableStubRunner, storageData) as ResolvedRunner<
                    ExecutableStubRunner<typeof storageData>>;
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner) as ResolvedRunner<
                    WithOtherInstanceStubRunner<typeof storageData>>;

            await expectAsync(withOtherInstanceStubRunner.getInstanceStage()).toBeResolvedTo(storageData);
            await localResolver.destroy();
        });

        it('with destroyed Resolved Runner in arguments', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);

            await executableStubRunner.destroy();
            const withOtherInstanceStubRunner$ = resolver.resolve(WithOtherInstanceStubRunner, executableStubRunner);

            await expectAsync(withOtherInstanceStubRunner$)
                .toBeRejectedWith(errorContaining(RunnerInitError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                        token: WithOtherInstanceStubRunner.name,
                        runnerName: WithOtherInstanceStubRunner.name,
                    }),
                    name: RunnerInitError.name,
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

        it('with destroyed Resolved Runner in arguments at runtime', async () => {
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner, storageData) as ResolvedRunner<
                    ExecutableStubRunner<typeof storageData>
                >;

            const withOtherInstanceStubRunner$ = resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner) as Promise<
                    ResolvedRunner<WithOtherInstanceStubRunner<typeof storageData>>
                >;
            await executableStubRunner.destroy();
            const withOtherInstanceStubRunner = await withOtherInstanceStubRunner$;

            await expectAsync(withOtherInstanceStubRunner$).toBeResolved();
            await expectAsync(withOtherInstanceStubRunner.getInstanceStage())
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    name: ConnectionClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));

            // The event queue is handled differently in different browsers.
            // In IE11, Resolve and Destroy actions are dispatched at the same time.
            // In other browsers, the Resolve response comes before the Destroy action is dispatched.
            await withOtherInstanceStubRunner.destroy().catch(() => {
                // stub
            });
        });

        it('with extended class', async () => {
            const executableStubRunner = await resolver.resolve(ExtendedStubRunner);
            await expectAsync(executableStubRunner.amount(7, 35)).toBeResolvedTo(42);
        });

        it('with exception', async () => {
            const errorMessage = 'Constructor Error';
            await expectAsync(resolver.resolve(ErrorStubRunner, errorMessage))
                .toBeRejectedWith(errorContaining(RunnerInitError, {
                    message: errorMessage,
                    name: RunnerInitError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it('not exist by token', async () => {
            const token = 'NotExistRunnerToken';
            await expectAsync(resolver.resolve(token)).toBeRejectedWith(errorContaining(RunnerNotFound, {
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({ token }),
                name: RunnerNotFound.name,
                stack: jasmine.stringMatching(/.+/),
            }));
        });
    }),
);

each(resolverClientList, (mode, resolver) =>
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

        it('not exist', async () => {
            class AnonymRunner {}
            await expectAsync(resolver.resolve(AnonymRunner)).toBeRejectedWith(errorContaining(RunnerNotFound, {
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({token: AnonymRunner.name}),
                name: RunnerNotFound.name,
                stack: jasmine.stringMatching(/.+/),
            }));
        });
    }),
);

each(localResolversConstructors, (mode, IterateRunnerResolverLocal) =>
    describe(`${mode} constructor`, () => {
        it('resolving without configuration', async () => {
            class RunnerStub {}
            const localResolver = new IterateRunnerResolverLocal();
            localResolver.run();

            await localResolver.resolve(RunnerStub)
            await expectAsync(localResolver.resolve(RunnerStub)).toBeResolved();

            await localResolver.destroy();
        });
    }),
);

each(apartHostClientResolvers, (mode, resolvers) => 
    describe(`${mode} constructor`, () => {
        it('by token without Client configuration', async () => {
            const apartConfiguredRunnerResolvers = createApartClientHostResolvers({
                hostConfig: {
                    runners: [
                        {
                            token: EXECUTABLE_STUB_RUNNER_TOKEN,
                            runner: ExecutableStubRunner,
                        },
                    ],
                },
                runnerResolverClientConstructor: resolvers.client,
                runnerResolverHostConstructor: resolvers.host,
            });
            await apartConfiguredRunnerResolvers.run();

            await expectAsync(
                apartConfiguredRunnerResolvers.client.resolve(EXECUTABLE_STUB_RUNNER_TOKEN)
            ).toBeResolved();

            await apartConfiguredRunnerResolvers.destroy();
        });

        it('by runner constructor without Client configuration', async () => {
            const apartConfiguredRunnerResolvers = createApartClientHostResolvers({
                hostConfig: {
                    runners: [ExecutableStubRunner],
                },
                runnerResolverClientConstructor: resolvers.client,
                runnerResolverHostConstructor: resolvers.host,
            });
            await apartConfiguredRunnerResolvers.run();

            await expectAsync(
                apartConfiguredRunnerResolvers.client.resolve(ExecutableStubRunner)
            ).toBeResolved();

            await apartConfiguredRunnerResolvers.destroy();
        });

        it('with Resolved Runner in arguments and without Client/Host configuration', async () => {
            const apartConfiguredRunnerResolvers = createApartClientHostResolvers({
                clientConfig: {
                    runners: [WithOtherInstanceStubRunner],
                },
                hostConfig: {
                    runners: [
                        WithOtherInstanceStubRunner,
                    ],
                },
                runnerResolverClientConstructor: resolvers.client,
                runnerResolverHostConstructor: resolvers.host,
            });

            const localResolver = new RunnerResolverLocal();
            localResolver.run();
            const resolvedExecutableStubRunner = await localResolver.resolve(ExecutableStubRunner);
            
            await apartConfiguredRunnerResolvers.run();
            await expectAsync(
                apartConfiguredRunnerResolvers.client
                    .resolve(WithOtherInstanceStubRunner, resolvedExecutableStubRunner)
            ).toBeResolved();

            await apartConfiguredRunnerResolvers.destroy();
        });
    }),
);
