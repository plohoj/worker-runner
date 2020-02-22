import { IRunnerError, ResolveRunner, RunnerErrorCode, RunnerErrorMessages } from '@worker-runner/core';
import { DevRunnerResolver } from '@worker-runner/promise';
import { devRunnerResolver, runnerResolver } from 'test/common/promise';
import { rxDevRunnerResolver, rxRunnerResolver } from 'test/common/rx';
import { ErrorStubRunner } from 'test/common/stubs/error-stub.runner';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from 'test/common/stubs/with-other-instance-stub.runner';
import { each } from 'test/utils/each';

each({
        Common: runnerResolver,
        Dev: devRunnerResolver,
        Rx: rxRunnerResolver as any as typeof runnerResolver,
        'Rx Dev': rxDevRunnerResolver as any as typeof devRunnerResolver,
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
            await expectAsync(errorStubRunner.destroy()).toBeRejectedWith(jasmine.objectContaining({
                errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
                message: 'DESTROY_EXCEPTION',
            } as IRunnerError));
        });

        it ('which is used', async () => {
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner) as ResolveRunner<ExecutableStubRunner>;
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner) as ResolveRunner<
                    WithOtherInstanceStubRunner>;
            await executableStubRunner.destroy();
            await expectAsync(withOtherInstanceStubRunner.getInstanceStage())
                .toBeRejectedWith(jasmine.objectContaining({
                    errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                    error: jasmine.objectContaining({
                        message: RunnerErrorMessages.RUNNER_NOT_INIT,
                    }),
                } as IRunnerError));
        });

        it ('destroyed runner', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await executableStubRunner.destroy();
            await expectAsync(executableStubRunner.destroy()).toBeRejectedWith(jasmine.objectContaining({
                message: RunnerErrorMessages.RUNNER_NOT_INIT,
                errorCode: RunnerErrorCode.RUNNER_NOT_INIT,
            } as IRunnerError));
        });
    }),
);

describe(`Dev destroy runner`, () => {
    it ('with extended method', async () => {
        class DestroyableRunner {
            public destroy(): void {
                // stub
            }
        }
        const destroySpy = spyOn(DestroyableRunner.prototype, 'destroy');
        const devResolver = new DevRunnerResolver({ runners: [DestroyableRunner] });
        await devResolver.run();
        const destroyableRunner = await devResolver.resolve(DestroyableRunner);
        await destroyableRunner.destroy();
        expect(destroySpy).toHaveBeenCalled();
        await devResolver.destroy();
    });
});
