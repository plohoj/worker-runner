import { ResolvedRunner, RunnerNotInitError, WorkerRunnerErrorMessages } from '@worker-runner/core';
import { RxRunnerEmitError } from '@worker-runner/rx/errors/runner-errors';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { rxLocalRunnerResolver, rxRunnerResolver } from 'test/common/rx';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { RxStubRunner } from 'test/common/stubs/rx-stub.runner';
import { each } from 'test/utils/each';
import { errorContaining } from 'test/utils/error-containing';
import { waitTimeout } from 'test/utils/wait-timeout';

each({
    Rx: rxRunnerResolver,
    'Local Rx': rxLocalRunnerResolver,
}, (mode, resolver) => describe(mode, () => {

    beforeAll(async () => {
        await resolver.run();
    });

    afterAll(async () => {
        await resolver.destroy();
    });

    it('simple observable', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        await expectAsync(
            (await rxStubRunner.emitMessages(['Book', 'Pen'])).toPromise(),
        ).toBeResolvedTo('Pen');
        await rxStubRunner.destroy();
    });

    it('observable with delay', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const emitDelay = 19;
        await waitTimeout(
            expectAsync(
                (await rxStubRunner.emitMessages(['Work', 'Job'], emitDelay)).toPromise(),
            ).toBeResolvedTo('Job'),
            emitDelay + 125,
            emitDelay,
        );
        await rxStubRunner.destroy();
    });

    it('subscribe and destroy runner', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitMessages([], 1000);
        await expectAsync(
            from(rxStubRunner.destroy()).pipe(switchMap(() => observable)).toPromise(),
        ).toBeRejectedWith(errorContaining(RunnerNotInitError, {
            message: WorkerRunnerErrorMessages.RUNNER_NOT_INIT,
            name: RunnerNotInitError.name,
            stack: jasmine.stringMatching(/.+/),
        }));
    });

    it('subscribe after destroy runner', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitMessages([], 1000);
        await rxStubRunner.destroy();
        await expectAsync(observable.toPromise()).toBeRejectedWith(errorContaining(RunnerNotInitError, {
            message: WorkerRunnerErrorMessages.RUNNER_NOT_INIT,
            name: RunnerNotInitError.name,
            stack: jasmine.stringMatching(/.+/),
        }));
    });

    it('emit resolved runner', async () => {
        const storageData = {
            id: 5136,
            type: 'STORAGE_DATA',
        };
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        await rxStubRunner.run();
        const executableStubRunner = await (await rxStubRunner.resolveExecutableRunner(storageData))
            .toPromise() as ResolvedRunner<ExecutableStubRunner<typeof storageData>>;
        await expectAsync(executableStubRunner.getStage()).toBeResolvedTo(storageData);
    });

    it('emit error', async () => {
        const errorData = {
            id: 5166,
            type: 'ERROR',
        };
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        await expectAsync((await (await rxStubRunner.emitError(errorData))).toPromise())
            .toBeRejectedWith(errorContaining(RxRunnerEmitError, {
                message: errorData.toString(),
                name: RxRunnerEmitError.name,
                stack: jasmine.stringMatching(/.+/),
            }));
    });

    it('emit error after destroy runner', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitError(undefined);
        await rxStubRunner.destroy();
        await expectAsync(observable.toPromise()).toBeRejectedWith(errorContaining(RunnerNotInitError, {
            message: WorkerRunnerErrorMessages.RUNNER_NOT_INIT,
            name: RunnerNotInitError.name,
            stack: jasmine.stringMatching(/.+/),
        }));
    });

    it('emit error after unsubscribe', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitError(undefined);
        observable.subscribe().unsubscribe();
    });
}));

