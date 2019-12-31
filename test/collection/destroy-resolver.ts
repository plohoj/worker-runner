import { DevRunnerResolver } from '@worker-runner/promise/dev/runner.resolver';
import { devRunnerResolver, runnerResolver } from 'test/common/promise';
import { rxResolver } from 'test/common/rx';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { each } from 'test/utils/each';

each({
        Common: runnerResolver,
        Dev: devRunnerResolver,
        Rx: rxResolver as any as typeof runnerResolver,
    },
    (mode, resolver) => describe(`${mode} destroy resolver`, () => {
        it ('for restart', async () => {
            await resolver.run();
            await resolver.destroy();
            await resolver.run();

            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await expectAsync(executableStubRunner.amount(17, 68)).toBeResolvedTo(85);
            await resolver.destroy();
        });
    }),
);

describe(`Dev destroy resolver`, () => {
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
