import { IRunnerError } from '@core/commands/runner-error';
import { RunnerErrorCode, RunnerErrorMessages } from '@core/errors/runners-errors';
import { DevRunnerResolver } from '@modules/promise/dev/runner.resolver';
import { CalcAmountRunner } from '../common/calc-amount.runner';
import { resolver } from '../common/promise';
import { RunnerWidthException } from '../common/runner-with-exception';

describe('Destroy runner', () => {

    beforeAll(async () => {
        await resolver.run();
    });

    afterAll(async () => {
        resolver.destroy();
    });

    it ('simple', async () => {
        const calcRunner = await resolver.resolve(CalcAmountRunner);
        const destroyData = await calcRunner.destroy();
        expect(destroyData).toBe(undefined);
    });

    it ('with exception in method', async () => {
        const runnerWithException = await resolver.resolve(RunnerWidthException);
        await expectAsync(runnerWithException.destroy()).toBeRejectedWith(jasmine.objectContaining({
            error: {},
            errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
            message: 'DESTROY_EXCEPTION',
        } as IRunnerError));
    });

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

    it ('destroyed runner', async () => {
        const calcRunner = await resolver.resolve(CalcAmountRunner);
        await calcRunner.destroy();
        await expectAsync(calcRunner.destroy()).toBeRejectedWith({
            error: RunnerErrorMessages.INSTANCE_NOT_FOUND,
            errorCode: RunnerErrorCode.RUNNER_DESTROY_INSTANCE_NOT_FOUND,
        } as IRunnerError);
    });
});

