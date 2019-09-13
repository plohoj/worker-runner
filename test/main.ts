
import { resolver } from "./common";
import { CalcAmountRunner } from "./common/calc-amount-runner";
import { DelayRunner } from "./common/delay-runner";
import { SumOfArrayRunner } from "./common/sum-of-array-runner";

describe("Runner tests", function() {
    it("simple amount calculation", async function() {
        await resolver.run();
        const calcRunner = await resolver.resolve(CalcAmountRunner);
        const result = await calcRunner.calc(17, 68);
        expect(result).toBe(85);
    });

    it("runner with extended class", async function() {
        await resolver.run();
        const sumOfArrayCalcRunner = await resolver.resolve(SumOfArrayRunner);
        const result = await sumOfArrayCalcRunner.calcArray([7,35,64]);
        expect(result).toBe(106);
    });

    it("return promise", async function() {
        await resolver.run();
        const delayRunner = await resolver.resolve(DelayRunner);
        const delayDuration = 75;
        const testStart = Date.now();
        await expectAsync(delayRunner.delay(delayDuration)).toBeResolved();
        const actualDelayDuration = Date.now() - testStart;
        if (actualDelayDuration < delayDuration ) {
            fail('the delay was less than necessary');
        }
        if (actualDelayDuration > delayDuration + 35) {
            fail('the delay was too long');
        }
    });
});

