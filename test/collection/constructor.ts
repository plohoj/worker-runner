import { IRunnerError } from "@core/commands/runner-error";
import { Constructor } from "@core/constructor";
import { RunnerErrorCode, RunnerErrorMessages } from "@core/errors/runners-errors";
import { resolver } from "../common";
import { RunnerWithConstructorError } from "../common/runner-width-constructor-error";
import { StorageRunner } from "../common/storage.runner";
import { SumOfArrayRunner } from "../common/sum-of-array.runner";

describe("Constructor", function() {

    beforeAll(async function () {
        await resolver.run();
    });

    afterAll(async function() {
        resolver.destroy();
    });

    it ("with arguments", async function() {
        const storageData = {
            id: 5326,
            type: 'STORAGE_DATA',
        };
        const storageRunner = await resolver
            .resolve(StorageRunner as Constructor<StorageRunner<typeof storageData>>, storageData);
        const returnedStorageData = await storageRunner.getStorage();
        expect(storageData).toEqual(returnedStorageData);
    });

    
    it("with extended class", async function() {
        const sumOfArrayCalcRunner = await resolver.resolve(SumOfArrayRunner);
        const result = await sumOfArrayCalcRunner.calcArray([7,35,64]);
        expect(result).toBe(106);
    });
 
    it ("with exception", async function() {
        await expectAsync(resolver.resolve(RunnerWithConstructorError)).toBeRejectedWith(
            jasmine.objectContaining({ error: {}, errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_ERROR } as IRunnerError));
    });

    it ("not exist", async function() {
        await expectAsync(resolver.resolve(class {})).toBeRejectedWith({
            error: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
            errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND
        } as IRunnerError);
    });

});

