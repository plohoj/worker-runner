import { WorkerNotInitError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
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
            await expectAsync(resolver.destroy()).toBeRejectedWith(errorContaining(WorkerNotInitError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.WORKER_NOT_INIT(),
                name: WorkerNotInitError.name,
                stack: jasmine.stringMatching(/.+/),
            }));
        });

        it ('and resolve Runner', async () => {
            await expectAsync(resolver.resolve(ExecutableStubRunner))
                .toBeRejectedWith(errorContaining(WorkerNotInitError, {
                    message: WORKER_RUNNER_ERROR_MESSAGES.WORKER_NOT_INIT(),
                    name: WorkerNotInitError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });
    }),
);

each({
        Local: LocalRunnerResolver,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'Rx Local': RxLocalRunnerResolver as any as typeof LocalRunnerResolver,
    },
    (mode, IterateLocalRunnerResolver) => describe(`${mode} destroy resolver`, () => {
        it ('without force mode', async () => {
            class ForceDestroy {
                public destroy(): void {
                    // Stub
                }
            }
            const destroySpy = spyOn(ForceDestroy.prototype, 'destroy');
            const localResolver = new IterateLocalRunnerResolver ({ runners: [ForceDestroy] });
            await localResolver.run();
            await localResolver.resolve(ForceDestroy);
            await localResolver.destroy();
            expect(destroySpy).toHaveBeenCalled();
        });

        it ('with force mode', async () => {
            class ForceDestroy {
                public destroy(): void {/* Stub */}
            }
            const destroySpy = spyOn(ForceDestroy.prototype, 'destroy');
            const localResolver = new IterateLocalRunnerResolver({ runners: [ForceDestroy] });
            await localResolver.run();
            await localResolver.resolve(ForceDestroy);
            await localResolver.destroy(true);
            expect(destroySpy).not.toHaveBeenCalled();
        });
    }),
);
