import { IRunnerError } from '@core/actions/runner-error';
import { RunnerErrorCode, RunnerErrorMessages } from '@core/errors/runners-errors';
import { DevRunnerResolver } from '@modules/promise/dev/runner.resolver';
import { devRunnerResolver, runnerResolver } from 'test/common/promise';
import { rxResolver } from 'test/common/rx';
import { ErrorStubRunner } from 'test/common/stubs/error-stub.runner';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { each } from 'test/utils/each';

each({
        Common: runnerResolver,
        Dev: devRunnerResolver,
        Rx: rxResolver as any as typeof runnerResolver,
    },
    (mode, resolver) => describe(`${mode} destroy runner`, () => {

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            resolver.destroy();
        });

        it ('simple', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const destroyData = await executableStubRunner.destroy();
            expect(destroyData).toBe(undefined);
        });

        it ('with exception in method', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            await expectAsync(errorStubRunner.destroy()).toBeRejectedWith(jasmine.objectContaining({
                error: {},
                errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
                message: 'DESTROY_EXCEPTION',
            } as IRunnerError));
        });

        it ('destroyed runner', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await executableStubRunner.destroy();
            await expectAsync(executableStubRunner.destroy()).toBeRejectedWith({
                error: RunnerErrorMessages.INSTANCE_NOT_FOUND,
                errorCode: RunnerErrorCode.RUNNER_DESTROY_INSTANCE_NOT_FOUND,
            } as IRunnerError);
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
        const devResolver = new DevRunnerResolver({
            workerPath: '',
            runners: [DestroyableRunner],
        });
        await devResolver.run();
        const destroyableRunner = await devResolver.resolve(DestroyableRunner);
        destroyableRunner.destroy();
        expect(destroySpy).toHaveBeenCalled();
        devResolver.destroy();
    });
});
