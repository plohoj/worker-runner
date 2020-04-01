import { ResolvedRunner, RunnerDestroyError, RunnerExecuteError, RunnerNotInitError, WorkerRunnerErrorMessages } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { RxLocalRunnerResolver } from '@worker-runner/rx';
import { localRunnerResolver, runnerResolver } from 'test/common/promise';
import { rxLocalRunnerResolver, rxRunnerResolver } from 'test/common/rx';
import { ErrorStubRunner } from 'test/common/stubs/error-stub.runner';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from 'test/common/stubs/with-other-instance-stub.runner';
import { each } from 'test/utils/each';
import { errorContaining } from 'test/utils/error-containing';

each({
        Common: runnerResolver,
        Local: localRunnerResolver,
        Rx: rxRunnerResolver as any as typeof runnerResolver,
        'Rx Local': rxLocalRunnerResolver as any as typeof localRunnerResolver,
    },
    (mode, resolver) => describe(`${mode} destroy runner`, () => {

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it ('simple', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const destroyData = await executableStubRunner.destroy();
            expect(destroyData).toBe(undefined);
        });

        it ('with exception in method', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            await expectAsync(errorStubRunner.destroy()).toBeRejectedWith(errorContaining(RunnerDestroyError, {
                message: 'DESTROY_EXCEPTION',
                name: Error.name,
                stack: jasmine.stringMatching(/.+/),
            }));
        });

        it ('which is used', async () => {
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner) as ResolvedRunner<ExecutableStubRunner>;
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner) as ResolvedRunner<
                    WithOtherInstanceStubRunner>;
            await executableStubRunner.destroy();
            await expectAsync(withOtherInstanceStubRunner.getInstanceStage())
                .toBeRejectedWith(errorContaining(RunnerExecuteError, {
                    name: RunnerExecuteError.name,
                    message: WorkerRunnerErrorMessages.RUNNER_NOT_INIT,
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it ('destroyed runner', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await executableStubRunner.destroy();
            await expectAsync(executableStubRunner.destroy()).toBeRejectedWith(errorContaining(RunnerNotInitError, {
                name: RunnerNotInitError.name,
                message: WorkerRunnerErrorMessages.RUNNER_NOT_INIT,
                stack: jasmine.stringMatching(/.+/),
            }));
        });
    }),
);

describe(`Local destroy runner`, () => {
    it ('with extended method', async () => {
        class DestroyableRunner {
            public destroy(): void {
                // stub
            }
        }
        const destroySpy = spyOn(DestroyableRunner.prototype, 'destroy');
        const localResolver = new LocalRunnerResolver({ runners: [DestroyableRunner] });
        await localResolver.run();
        const destroyableRunner = await localResolver.resolve(DestroyableRunner);
        await destroyableRunner.destroy();
        expect(destroySpy).toHaveBeenCalled();
        await localResolver.destroy();
    });
});

each({
        Local: LocalRunnerResolver,
        'Rx Local': RxLocalRunnerResolver as any as typeof LocalRunnerResolver,
    },
    (mode, IterateLocalRunnerResolver) => describe(`${mode} Local destroy runner`, () => {
        it ('with extended method', async () => {
            class DestroyableRunner {
                public destroy(): void {
                    // stub
                }
            }
            const destroySpy = spyOn(DestroyableRunner.prototype, 'destroy');
            const localResolver = new IterateLocalRunnerResolver({ runners: [DestroyableRunner] });
            await localResolver.run();
            const destroyableRunner = await localResolver.resolve(DestroyableRunner);
            await destroyableRunner.destroy();
            expect(destroySpy).toHaveBeenCalled();
            await localResolver.destroy();
        });
    }),
);
