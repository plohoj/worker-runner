import { ConnectionClosedError, DisconnectReason, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { each } from '../client/utils/each';
import { errorContaining } from '../client/utils/error-containing';
import { pickResolverFactories } from '../client/utils/pick-resolver-factories';
import { ExecutableStubRunner } from '../common/stubs/executable-stub.runner';

each(pickResolverFactories(), (mode, resolverFactory) =>
    describe(`${mode} destroy resolver:`, () => {
        const resolver = resolverFactory();

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('should resolve Runner after restarting Resolver', async () => {
            await resolver.destroy();
            await resolver.run();

            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await expectAsync(executableStubRunner.amount(17, 68)).toBeResolvedTo(85);
        });

        it('should throw an error when destroying an already destroyed Resolver', async () => {
            await resolver.destroy();

            await expectAsync(resolver.destroy()).toBeRejectedWith(errorContaining(ConnectionClosedError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                    disconnectReason: DisconnectReason.ConnectionNotYetEstablished,
                }),
                disconnectReason: DisconnectReason.ConnectionNotYetEstablished,
                name: ConnectionClosedError.name,
                stack: jasmine.stringMatching(/.+/),
            }));

            // restoring
            await resolver.run();
        });

        it('should throw an error on resolving Runner after destroying Resolver', async () => {
            await resolver.destroy();

            await expectAsync(resolver.resolve(ExecutableStubRunner))
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                        disconnectReason: DisconnectReason.ConnectionNotYetEstablished,
                    }),
                    disconnectReason: DisconnectReason.ConnectionNotYetEstablished,
                    name: ConnectionClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));

            // restoring
            await resolver.run();
        });
    }),
);

each(pickResolverFactories('Local'), (mode, factoryResolver) =>
    describe(`${mode} destroy resolver:`, () => {
        const resolver = factoryResolver();

        beforeAll(() => {
            resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('should destroy the Runner while destroying the Resolver', async () => {
            class DestroyStub {
                public destroy(): void {
                    // Stub
                }
            }
            const destroySpy = spyOn(DestroyStub.prototype, 'destroy');

            await resolver.resolve(DestroyStub);
            await resolver.destroy();

            expect(destroySpy).toHaveBeenCalled();

            // restoring
            resolver.run();
        });
    }),
);
