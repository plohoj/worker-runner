import { IRunnerError, RunnerErrorCode, RunnerErrorMessages, RunnerResolver } from "../../src";
import { resolver } from "../common";
import { CalcAmountRunner } from "../common/calc-amount.runner";
import { RunnerWidthException } from "../common/runner-with-exception";

describe("Destroy runner", function() {

    beforeAll(async function () {
        await resolver.run();
    });

    afterAll(async function() {
        resolver.destroy();
    });
    
    it ("simple", async function() {
        const calcRunner = await resolver.resolve(CalcAmountRunner);
        const destroyData = await calcRunner.destroy();
        expect(destroyData).toBe(undefined);
    });

    it ("with exception in method", async function() {
        const runnerWithException = await resolver.resolve(RunnerWidthException);
        await expectAsync(runnerWithException.destroy()).toBeRejectedWith(jasmine.objectContaining({
            error: {},
            errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
            message: 'DESTROY_EXCEPTION',
        } as IRunnerError));
    });

    it ("with extended method", async function() {
        class DestroyableRunner {
            public destroy(): void {}
        }
        const destroySpy = spyOn(DestroyableRunner.prototype, 'destroy');
        const resolver = new RunnerResolver({
            workerPath: '',
            devMode: true,
            runners: [DestroyableRunner],
        });
        await resolver.run();
        const destroyableRunner = await resolver.resolve(DestroyableRunner);
        destroyableRunner.destroy();
        expect(destroySpy).toHaveBeenCalled();
    });

    it ("destroyed runner", async function() {
        const calcRunner = await resolver.resolve(CalcAmountRunner);
        await calcRunner.destroy();
        await expectAsync(calcRunner.destroy()).toBeRejectedWith({
            error: RunnerErrorMessages.INSTANCE_NOT_FOUND,
            errorCode: RunnerErrorCode.RUNNER_DESTROY_INSTANCE_NOT_FOUND
        } as IRunnerError);
    });
});

