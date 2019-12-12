import { IRunnerError } from "@core/commands/runner-error";
import { RunnerErrorCode, RunnerErrorMessages } from "@core/errors/runners-errors";
import { DevRunnerResolver } from "@modules/promise/dev/runner.resolver";
import { CalcAmountRunner } from "../common/calc-amount.runner";

let resolver: DevRunnerResolver<typeof CalcAmountRunner>;

describe("Dev mode", function() {

    beforeAll(async function () {
        resolver = new DevRunnerResolver({
            workerPath: '',
            runners: [CalcAmountRunner],
        });
        await resolver.run();
    });

    afterAll(async function() {
        resolver.destroy();
    });

    it("execute simple amount calculation", async function() {
        const calcRunner = await resolver.resolve(CalcAmountRunner);
        const result = await calcRunner.calc(17, 68);
        expect(result).toBe(85);
    });

    it ("constructor not exist", async function() {
        // @ts-ignore
        await expectAsync(resolver.resolve(class {})).toBeRejectedWith({
            error: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
            errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND
        } as IRunnerError);
    });
});
