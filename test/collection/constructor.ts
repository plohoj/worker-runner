import { IRunnerError } from '@core/actions/runner-error';
import { RunnerErrorCode, RunnerErrorMessages } from '@core/errors/runners-errors';
import { Constructor } from '@core/types/constructor';
import { resolver } from '../common/promise';
import { RunnerWithConstructorError } from '../common/runner-width-constructor-error';
import { StorageRunner } from '../common/storage.runner';
import { SumOfArrayRunner } from '../common/sum-of-array.runner';

describe('Constructor', () => {

    beforeAll(async () => {
        await resolver.run();
    });

    afterAll(async () => {
        resolver.destroy();
    });

    it ('with arguments', async () => {
        const storageData = {
            id: 5326,
            type: 'STORAGE_DATA',
        };
        const storageRunner = await resolver
            .resolve(StorageRunner as Constructor<StorageRunner<typeof storageData>>, storageData);
        const returnedStorageData = await storageRunner.getStorage();
        expect(storageData).toEqual(returnedStorageData);
    });


    it('with extended class', async () => {
        const sumOfArrayCalcRunner = await resolver.resolve(SumOfArrayRunner);
        const result = await sumOfArrayCalcRunner.calcArray([7, 35, 64]);
        expect(result).toBe(106);
    });

    it ('with exception', async () => {
        await expectAsync(resolver.resolve(RunnerWithConstructorError)).toBeRejectedWith(
            jasmine.objectContaining({
                error: {},
                errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_ERROR,
            } as IRunnerError));
    });

    it ('not exist', async () => {
        await expectAsync(resolver.resolve(class {})).toBeRejectedWith({
            error: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
            errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND,
        } as IRunnerError);
    });

});

