import { ResolvedRunner } from '@worker-runner/core';
import { each } from '../client/utils/each';
import { pickApartResolverFactories } from '../client/utils/pick-apart-resolver-factories';
import { pickResolverFactories } from '../client/utils/pick-resolver-factories';
import { ExecutableStubRunner, EXECUTABLE_STUB_RUNNER_TOKEN } from '../common/stubs/executable-stub.runner';
import { WithLocalResolverStub } from '../common/stubs/with-local-resolver-stub.runner';

each(pickResolverFactories(), (mode, resolverFactory) =>
    describe(`${mode} return Resolved Runner:`, () => {
        const resolver = resolverFactory();

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('should return Resolved Runner as result from other Resolver', async () => {
            const storageData = {
                id: 4326,
                type: 'STORAGE_DATA',
            };
            const withLocalResolverStub = await resolver
                .resolve(WithLocalResolverStub) as ResolvedRunner<WithLocalResolverStub<typeof storageData>>;
            await withLocalResolverStub.run(storageData);

            const executableStubRunner = await withLocalResolverStub.resolveExecutableRunnerWithoutMarkForTransfer();

            await expectAsync(executableStubRunner.getStage()).toBeResolvedTo(storageData);
        });
    }),
);

each(pickResolverFactories('Local'), (mode, resolverFactory) =>
    describe(`${mode} return resolved runner:`, () => {
        const resolver = resolverFactory();

        beforeAll(() => {
            resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('with mark for transfer and disconnect', async () => {
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');
            const withLocalResolverStub = await resolver
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .resolve(WithLocalResolverStub) as ResolvedRunner<WithLocalResolverStub<any>>;
            await withLocalResolverStub.run({});
            const executableStubRunner = await withLocalResolverStub.resolveExecutableRunnerWithMarkForTransfer();
            expect(destroySpy).not.toHaveBeenCalled();
            await executableStubRunner.disconnect();
            expect(destroySpy).toHaveBeenCalled();
        });

        it('without mark for transfer and disconnect', async () => {
            const destroySpy = spyOn(ExecutableStubRunner.prototype, 'destroy');
            const withLocalResolverStub = await resolver
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .resolve(WithLocalResolverStub) as ResolvedRunner<WithLocalResolverStub<any>>;
            await withLocalResolverStub.run({});
            const executableStubRunner = await withLocalResolverStub.resolveExecutableRunnerWithoutMarkForTransfer();
            expect(destroySpy).not.toHaveBeenCalled();
            await executableStubRunner.disconnect();
            expect(destroySpy).not.toHaveBeenCalled();
            await withLocalResolverStub.destroy();
            expect(destroySpy).toHaveBeenCalled();
        });
    }),
);

each(pickApartResolverFactories(), (mode, resolverFactory) => 
    describe(`${mode} return resolved runner:`, () => {
        it('without Client configuration', async () => {
            const apartResolversManager = resolverFactory({
                hostConfig: {
                    runners: [
                        WithLocalResolverStub,
                        {
                            token: EXECUTABLE_STUB_RUNNER_TOKEN,
                            runner: ExecutableStubRunner,
                        }
                    ],
                },
            });
            await apartResolversManager.run();
            const withLocalResolverStub = await apartResolversManager.client.resolve(WithLocalResolverStub);
            await withLocalResolverStub.run({});

            await expectAsync(withLocalResolverStub.resolveExecutableRunnerWithMarkForTransfer()).toBeResolved();

            // destroy
            await apartResolversManager.destroy();
        });

        it('without Client and Host configuration', async () => {
            const apartResolversManager = resolverFactory({
                hostConfig: {
                    runners: [WithLocalResolverStub],
                },
            });
            await apartResolversManager.run();
            const withLocalResolverStub = await apartResolversManager.client.resolve(WithLocalResolverStub);
            await withLocalResolverStub.run({});

            await expectAsync(withLocalResolverStub.resolveExecutableRunnerWithMarkForTransfer()).toBeResolved();

            // destroy
            await apartResolversManager.destroy();
        });
    }),
);
