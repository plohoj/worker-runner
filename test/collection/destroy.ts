import { RunnerErrorCode } from "../../src";
import { IRunnerError } from "../../src/commands/runner-error";
import { Constructor } from "../../src/constructor";
import { RunnerErrorMessages } from "../../src/errors/runners-errors";
import { resolver } from "../common";
import { CalcAmountRunner } from "../common/calc-amount.runner";
import { RunnerWidthException } from "../common/runner-with-exception";
import { StorageRunner } from "../common/storage.runner";

describe("Destroy", function() {

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

    it ("with extended method", async function() {
        const storageData = {
            id: 6572,
            type: 'STORAGE_DATA',
        };
        const storageRunner = await resolver
            .resolve(StorageRunner as Constructor<StorageRunner<typeof storageData>>, storageData);
        const destroyData = await storageRunner.destroy();
        expect(storageData).toEqual(destroyData);
    });

    it ("with exception in method", async function() {
        const runnerWithException = await resolver.resolve(RunnerWidthException);
        const exceptionError = 'DESTROY_EXCEPTION';
        await expectAsync(runnerWithException.destroy(exceptionError)).toBeRejectedWith(
            { error: exceptionError, errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR } as IRunnerError);
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

