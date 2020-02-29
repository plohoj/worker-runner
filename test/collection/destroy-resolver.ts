import { IRunnerError, RunnerErrorCode, RunnerErrorMessages } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { RxLocalRunnerResolver } from '@worker-runner/rx';
import { localRunnerResolver, runnerResolver } from 'test/common/promise';
import { rxLocalRunnerResolver, rxRunnerResolver } from 'test/common/rx';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { each } from 'test/utils/each';

each({
        Common: runnerResolver,
        Local: localRunnerResolver,
        Rx: rxRunnerResolver as any as typeof runnerResolver,
        'Rx Local': rxLocalRunnerResolver as any as typeof localRunnerResolver,
    },
    (mode, resolver) => describe(`${mode} destroy resolver`, () => {
        it ('for restart', async () => {
            await resolver.run();
            await resolver.destroy();
            await resolver.run();

            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await expectAsync(executableStubRunner.amount(17, 68)).toBeResolvedTo(85);
            await resolver.destroy();
        });

        it ('when it was already destroyed', async () => {
            await expectAsync(resolver.destroy()).toBeRejectedWith(jasmine.objectContaining({
                errorCode: RunnerErrorCode.WORKER_NOT_INIT,
                message: RunnerErrorMessages.WORKER_NOT_INIT,
            } as IRunnerError));
        });

        it ('and resolve Runner', async () => {
            await expectAsync(resolver.resolve(ExecutableStubRunner)).toBeRejectedWith(jasmine.objectContaining({
                errorCode: RunnerErrorCode.WORKER_NOT_INIT,
                message: RunnerErrorMessages.WORKER_NOT_INIT,
            } as IRunnerError));
        });
    }),
);

each({
        Local: LocalRunnerResolver,
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
                public destroy(): void {
                    // Stub
                }
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
