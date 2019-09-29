import { RunnerResolver } from "../../src";
import { resolver } from "../common";
import { CalcAmountRunner } from "../common/calc-amount.runner";

describe("Destroy resolver", function() {
    
    it ("for restart", async function() {
        await resolver.run();
        await resolver.destroy();
        await resolver.run();
        
        const calcRunner = await resolver.resolve(CalcAmountRunner);
        const result = await calcRunner.calc(17, 68);
        expect(result).toBe(85);
        await resolver.destroy();
    });

    it ("for restart with dev mode", async function() {
        const resolver = new RunnerResolver({
            workerPath: '',
            devMode: true,
            runners: [CalcAmountRunner],
        });
        await resolver.run();
        await resolver.destroy();
        await resolver.run();

        const calcRunner = await resolver.resolve(CalcAmountRunner);
        const result = await calcRunner.calc(17, 68);
        expect(result).toBe(85);
        await resolver.destroy();
    });

    it ("without force mode", async function() {
        class ForceDestroy {
            public destroy(): void {
            }
        }
        const destroySpy = spyOn(ForceDestroy.prototype, 'destroy');
        const resolver = new RunnerResolver({
            workerPath: '',
            devMode: true,
            runners: [ForceDestroy],
        });
        await resolver.run();
        await resolver.resolve(ForceDestroy);
        await resolver.destroy();
        expect(destroySpy).toHaveBeenCalled();
    });

    it ("with force mode", async function() {
        class ForceDestroy {
            public destroy(): void {}
        }
        const destroySpy = spyOn(ForceDestroy.prototype, 'destroy');
        const resolver = new RunnerResolver({
            workerPath: '',
            devMode: true,
            runners: [ForceDestroy],
        });
        await resolver.run();
        await resolver.resolve(ForceDestroy);
        await resolver.destroy(true);
        expect(destroySpy).not.toHaveBeenCalled();
    });
});

