import { RunnerErrorCode } from "../../src";
import { IRunnerError } from "../../src/commands/runner-error";
import { RunnerErrorMessages } from "../../src/errors/runners-errors";
import { resolver } from "../common";
import { CalcAmountRunner } from "../common/calc-amount.runner";
import { DelayRunner } from "../common/delay.runner";
import { RunnerWidthException } from "../common/runner-with-exception";

describe("Execute", function() {

    beforeAll(async function () {
        await resolver.run();
    });

    afterAll(async function() {
        resolver.destroy();
    });

    it("simple amount calculation", async function() {
        const calcRunner = await resolver.resolve(CalcAmountRunner);
        const result = await calcRunner.calc(17, 68);
        expect(result).toBe(85);
    });

    it("with promise", async function() {
        const delayRunner = await resolver.resolve(DelayRunner);
        const delayDuration = 75;
        const testStart = Date.now();
        await expectAsync(delayRunner.delay(delayDuration)).toBeResolved();
        const actualDelayDuration = Date.now() - testStart;
        if (actualDelayDuration < delayDuration ) {
            fail('the delay was less than necessary');
        }
        if (actualDelayDuration > delayDuration + 25) {
            fail('the delay was too long');
        }
    });

    it ("with exception", async function() {
        const runnerWithException = await resolver.resolve(RunnerWidthException);
        const exceptionError = 'METHOD_EXCEPTION';
        await expectAsync(runnerWithException.throwException(exceptionError)).toBeRejectedWith(
            { error: exceptionError, errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR } as IRunnerError);
    });

    it ("with delay exceptions", async function() {
        const runnerWithException = await resolver.resolve(RunnerWidthException);
        const exceptionError = 'METHOD_EXCEPTION_DELAY';
        const testStart = Date.now();
        const exceptDelayDuration = 55;
        await expectAsync(runnerWithException.throwExceptionWidthDelay(exceptionError, exceptDelayDuration)).toBeRejectedWith(
            { error: exceptionError, errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR } as IRunnerError);
        const actualDelayDuration = Date.now() - testStart;
        if (actualDelayDuration < exceptDelayDuration ) {
            fail('exception delay was less than necessary');
        }
        if (actualDelayDuration > exceptDelayDuration + 15) {
            fail('exception delay was too long');
        }
    });

    it ("not exist runner", async function() {
        const calcRunner = await resolver.resolve(CalcAmountRunner);
        await calcRunner.destroy();
        await expectAsync(calcRunner.calc(53, 95)).toBeRejectedWith({
            error: RunnerErrorMessages.INSTANCE_NOT_FOUND,
            errorCode: RunnerErrorCode.RUNNER_EXECUTE_INSTANCE_NOT_FOUND
        } as IRunnerError);
    });
});

