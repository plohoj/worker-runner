import { DevRunnerResolver } from '@modules/promise/dev/runner.resolver';
import { CalcAmountRunner } from '../common/calc-amount.runner';
import { resolver } from '../common/promise';

describe('Destroy resolver', () => {

    it ('for restart', async () => {
        await resolver.run();
        await resolver.destroy();
        await resolver.run();

        const calcRunner = await resolver.resolve(CalcAmountRunner);
        const result = await calcRunner.calc(17, 68);
        expect(result).toBe(85);
        await resolver.destroy();
    });

    it ('for restart with dev mode', async () => {
        const devResolver = new DevRunnerResolver({
            workerPath: '',
            runners: [CalcAmountRunner],
        });
        await devResolver.run();
        await devResolver.destroy();
        await resolver.run();

        const calcRunner = await devResolver.resolve(CalcAmountRunner);
        const result = await calcRunner.calc(17, 68);
        expect(result).toBe(85);
        await devResolver.destroy();
    });

    it ('without force mode', async () => {
        class ForceDestroy {
            public destroy(): void {
                // Stub
            }
        }
        const destroySpy = spyOn(ForceDestroy.prototype, 'destroy');
        const devResolver = new DevRunnerResolver ({
            workerPath: '',
            runners: [ForceDestroy],
        });
        await devResolver.run();
        await devResolver.resolve(ForceDestroy);
        await devResolver.destroy();
        expect(destroySpy).toHaveBeenCalled();
    });

    it ('with force mode', async () => {
        class ForceDestroy {
            public destroy(): void {
                // Stub
            }
        }
        const destroySpy = spyOn(ForceDestroy.prototype, 'destroy');
        const devResolver = new DevRunnerResolver({
            workerPath: '',
            runners: [ForceDestroy],
        });
        await devResolver.run();
        await devResolver.resolve(ForceDestroy);
        await devResolver.destroy(true);
        expect(destroySpy).not.toHaveBeenCalled();
    });
});

