import { IRunnerError, RunnerErrorCode, RunnerErrorMessages } from '@worker-runner/core';
import { DevRunnerResolver } from '@worker-runner/promise';
import { RxDevRunnerResolver } from '@worker-runner/rx';
import { devRunnerResolver, runnerResolver } from 'test/common/promise';
import { rxDevRunnerResolver, rxRunnerResolver } from 'test/common/rx';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { each } from 'test/utils/each';

each({
        Common: runnerResolver,
        Dev: devRunnerResolver,
        Rx: rxRunnerResolver as any as typeof runnerResolver,
        'Rx Dev': rxDevRunnerResolver as any as typeof devRunnerResolver,
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
        Dev: DevRunnerResolver,
        'Dev Rx': RxDevRunnerResolver as any as typeof DevRunnerResolver,
    },
    (mode, IterateDevRunnerResolver) => describe(`${mode} destroy resolver`, () => {
        it ('without force mode', async () => {
            class ForceDestroy {
                public destroy(): void {
                    // Stub
                }
            }
            const destroySpy = spyOn(ForceDestroy.prototype, 'destroy');
            const devResolver = new IterateDevRunnerResolver ({ runners: [ForceDestroy] });
            await devResolver.run();
            await devResolver.resolve(ForceDestroy);
            await devResolver.destroy();
            expect(destroySpy).toHaveBeenCalled();
        });

        it ('with force mode', async () => {
            class ForceDestroy {
                public destroy(): void {
                    // Stub
                }
            }
            const destroySpy = spyOn(ForceDestroy.prototype, 'destroy');
            const devResolver = new IterateDevRunnerResolver({ runners: [ForceDestroy] });
            await devResolver.run();
            await devResolver.resolve(ForceDestroy);
            await devResolver.destroy(true);
            expect(destroySpy).not.toHaveBeenCalled();
        });
    }),
);
