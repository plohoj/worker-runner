import { ConnectionClosedError, DisconnectReason, ResolvedRunner, RunnerDataTransferError, RunnerDefinitionCollection, RunnerInitError, RunnerNotFound, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { RunnerResolverLocal } from '@worker-runner/promise';
import { each } from '../client/utils/each';
import { errorContaining } from '../client/utils/error-containing';
import { pickApartResolverFactories } from '../client/utils/pick-apart-resolver-factories';
import { pickResolverFactories } from '../client/utils/pick-resolver-factories';
import { runners } from '../common/runner-list';
import { ErrorStubRunner } from '../common/stubs/error-stub.runner';
import { ExecutableStubRunner, EXECUTABLE_STUB_RUNNER_TOKEN } from '../common/stubs/executable-stub.runner';
import { ExtendedStubRunner, EXTENDED_STUB_RUNNER_TOKEN } from '../common/stubs/extended-stub.runner';
import { WithOtherInstanceStubRunner } from '../common/stubs/with-other-instance-stub.runner';

each(pickResolverFactories(), (mode, resolverFactory) =>
    describe(`${mode} constructor:`, () => {
        const resolver = resolverFactory();

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

        it('should throw an error when the argument for the Runner constructor is a Runner that has already been destroyed', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);

            await executableStubRunner.destroy();
            const withOtherInstanceStubRunner$ = resolver.resolve(WithOtherInstanceStubRunner, executableStubRunner);

            await expectAsync(withOtherInstanceStubRunner$)
                .toBeRejectedWith(errorContaining(RunnerDataTransferError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.DATA_TRANSFER_PREPARATION_ERROR(),
                    name: RunnerDataTransferError.name,
                    stack: jasmine.stringMatching(/.+/),
                    originalErrors: [errorContaining(ConnectionClosedError, {
                        message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                            disconnectReason: DisconnectReason.RunnerDestroyed,
                            token: EXECUTABLE_STUB_RUNNER_TOKEN,
                            runnerName: ExecutableStubRunner.name,
                        }),
                        disconnectReason: DisconnectReason.RunnerDestroyed,
                        name: ConnectionClosedError.name,
                        stack: jasmine.stringMatching(/.+/),
                    })],
                }));
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

        it('should throw an exception for an undeclared token on host', async () => {
            const token = 'NotExistRunnerToken';

            const request$ = resolver.resolve(token);

            await expectAsync(request$).toBeRejectedWith(errorContaining(RunnerNotFound, {
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({ token }),
                name: RunnerNotFound.name,
                stack: jasmine.stringMatching(/.+/),
            }));
        });

        it('should throw an error when the Resolved Runner that was passed as an argument was destroyed during resolving Runner', async () => {
            // This case is reproduced only for the local Resolver (for instant message delivery through the channel)
            const storageData = {
                id: 5326,
                type: 'STORAGE_DATA',
            };
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner, storageData) as ResolvedRunner<ExecutableStubRunner<typeof storageData>>;

            const destroy$ = executableStubRunner.destroy();
            const withOtherInstanceStubRunner$ = resolver.resolve(
                WithOtherInstanceStubRunner, executableStubRunner
            ) as Promise<ResolvedRunner<WithOtherInstanceStubRunner<typeof storageData>>>;
            await destroy$;

            await expectAsync(withOtherInstanceStubRunner$).toBeRejectedWith(errorContaining(RunnerDataTransferError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.DATA_TRANSFER_PREPARATION_ERROR(),
                name: RunnerDataTransferError.name,
                stack: jasmine.stringMatching(/.+/),
                originalErrors: [
                    errorContaining(ConnectionClosedError, {
                        message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                            disconnectReason: DisconnectReason.RunnerDestroyed,
                            token: EXECUTABLE_STUB_RUNNER_TOKEN,
                            runnerName: ExecutableStubRunner.name,
                        }),
                        disconnectReason: DisconnectReason.RunnerDestroyed,
                        name: ConnectionClosedError.name,
                        stack: jasmine.stringMatching(/.+/),
                    }),
                ],
            }));
        });
    }),
);

each({...pickResolverFactories('Worker'), ...pickResolverFactories('Iframe')}, (mode, resolverFactory) =>
    describe(`${mode} constructor:`, () => {
        const resolver = resolverFactory();

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

        it('should throw an exception for an undeclared runner on the host', async () => {
            class AnonymRunner {}

            const request$ = resolver.resolve(AnonymRunner);

            await expectAsync(request$).toBeRejectedWith(errorContaining(RunnerNotFound, {
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({
                    token: RunnerDefinitionCollection.generateTokenForRunnerConstructor(AnonymRunner)}),
                name: RunnerNotFound.name,
                stack: jasmine.stringMatching(/.+/),
            }));
        });
    }),
);

each(pickResolverFactories('Local'), (mode, resolverFactory) =>
    describe(`${mode} constructor:`, () => {
        const resolver = resolverFactory([]);

        beforeAll(() => {
            resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('should resolve Soft Runner without configuration', async () => {
            class RunnerStub {}

            await expectAsync(resolver.resolve(RunnerStub)).toBeResolved();
        });
    }),
);

each(pickApartResolverFactories(), (mode, resolverFactory) =>
    describe(`${mode} constructor:`, () => {
        it('by token without Client configuration', async () => {
            const apartResolversManager = resolverFactory({
                hostConfig: {
                    runners: [
                        {
                            token: EXECUTABLE_STUB_RUNNER_TOKEN,
                            runner: ExecutableStubRunner,
                        },
                    ],
                },
            });
            await apartResolversManager.run();

            await expectAsync(
                apartResolversManager.client.resolve(EXECUTABLE_STUB_RUNNER_TOKEN)
            ).toBeResolved();

            await apartResolversManager.destroy();
        });

        it('by runner constructor without Client configuration', async () => {
            const apartResolversManager = resolverFactory({
                hostConfig: {
                    runners: [ExecutableStubRunner],
                },
            });
            await apartResolversManager.run();

            await expectAsync(
                apartResolversManager.client.resolve(ExecutableStubRunner)
            ).toBeResolved();

            await apartResolversManager.destroy();
        });

        it('should request methods names for Resolved Runner as argument, from Local Resolver when Runner not exist in Client/Host Resolver configuration', async () => {
            const apartResolversManager = resolverFactory({
                clientConfig: {
                    runners: [WithOtherInstanceStubRunner],
                },
                hostConfig: {
                    runners: [
                        WithOtherInstanceStubRunner,
                    ],
                },
            });
            const localResolver = new RunnerResolverLocal();
            localResolver.run();
            const resolvedExecutableStubRunner = await localResolver.resolve(ExecutableStubRunner);
            await apartResolversManager.run();

            const request$ = apartResolversManager.client
                .resolve(WithOtherInstanceStubRunner, resolvedExecutableStubRunner)
            
            await expectAsync(request$).toBeResolved();

            // destroy
            await apartResolversManager.destroy();
        });
    }),
);
