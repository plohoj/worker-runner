import { ConnectionWasClosedError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { RxLocalRunnerResolver } from '@worker-runner/rx';
import { resolverList } from 'test/common/resolver-list';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { each } from 'test/utils/each';
import { errorContaining } from 'test/utils/error-containing';

each(resolverList, (mode, resolver) =>
    describe(`${mode} destroy resolver`, () => {
        it ('for restart', async () => {
            await resolver.run();
            await resolver.destroy();
            await resolver.run();

            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await expectAsync(executableStubRunner.amount(17, 68)).toBeResolvedTo(85);
            await resolver.destroy();
        });

        it ('when it was already destroyed', async () => {
            await expectAsync(resolver.destroy()).toBeRejectedWith(errorContaining(ConnectionWasClosedError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.HOST_RESOLVER_NOT_INIT(),
                name: ConnectionWasClosedError.name,
                stack: jasmine.stringMatching(/.+/),
            }));
        });

        it ('and resolve Runner', async () => {
            await expectAsync(resolver.resolve(ExecutableStubRunner))
                .toBeRejectedWith(errorContaining(ConnectionWasClosedError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.HOST_RESOLVER_NOT_INIT(),
                    name: ConnectionWasClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });
    }),
);

each({
        Local: LocalRunnerResolver,
        'Rx Local': RxLocalRunnerResolver as unknown as typeof LocalRunnerResolver,
    },
    (mode, IterateLocalRunnerResolver) => describe(`${mode} destroy resolver`, () => {
        it ('simple', async () => {
            class DestroyStub {
                public destroy(): void {
                    // Stub
                }
            }
            const destroySpy = spyOn(DestroyStub.prototype, 'destroy');
            const localResolver = new IterateLocalRunnerResolver({ runners: [DestroyStub] });
            await localResolver.run();
            await localResolver.resolve(DestroyStub);
            await localResolver.destroy();
            expect(destroySpy).toHaveBeenCalled();
        });
    }),
);
