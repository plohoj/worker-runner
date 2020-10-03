import { ResolvedRunner, RunnerWasDisconnectedError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { RxRunnerEmitError } from '@worker-runner/rx';
import { rxLocalRunnerResolver, rxRunnerResolver } from 'test/common/rx';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { RxStubRunner } from 'test/common/stubs/rx-stub.runner';
import { each } from 'test/utils/each';
import { errorContaining } from 'test/utils/error-containing';
import { isIE } from 'test/utils/is-internet-explorer';

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
        await expectAsync(
            (await rxStubRunner.emitMessages(['Work', 'Job'], emitDelay)).toPromise(),
        ).toBeResolvedTo('Job');
        await rxStubRunner.destroy();
    });

    it('subscribe and destroy runner', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitMessages([], 1000);
        await rxStubRunner.destroy();
        await expectAsync(
            observable.toPromise(),
        ).toBeRejectedWith(errorContaining(RunnerWasDisconnectedError, {
            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_WAS_DISCONNECTED({
                runnerName: RxStubRunner.name,
            }),
            name: RunnerWasDisconnectedError.name,
            stack: jasmine.stringMatching(/.+/),
        }));
    });

    it('subscribe after destroy runner', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitMessages([], 1000);
        await rxStubRunner.destroy();
        await expectAsync(observable.toPromise()).toBeRejectedWith(errorContaining(RunnerWasDisconnectedError, {
            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_WAS_DISCONNECTED({
                runnerName: RxStubRunner.name,
            }),
            name: RunnerWasDisconnectedError.name,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expectedProperty: Record<any, any> = {
            message: errorData.toString(),
            name: RxRunnerEmitError.name,
        };
        if (!isIE) {
            expectedProperty.stack = jasmine.stringMatching(/.+/);
        }
        await expectAsync((await (await rxStubRunner.emitError(errorData))).toPromise())
            .toBeRejectedWith(errorContaining(RxRunnerEmitError, expectedProperty));
    });

    it('emit error after destroy runner', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitError();
        await rxStubRunner.destroy();
        await expectAsync(observable.toPromise()).toBeRejectedWith(errorContaining(RunnerWasDisconnectedError, {
            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_WAS_DISCONNECTED({
                runnerName: RxStubRunner.name,
            }),
            name: RunnerWasDisconnectedError.name,
            stack: jasmine.stringMatching(/.+/),
        }));
    });

    it('emit error after unsubscribe', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitError();
        observable.subscribe().unsubscribe();
    });

    it('emit from other runner', async () => {
        const firstRxStubRunner = await resolver.resolve(RxStubRunner);
        const secondRxStubRunner = await resolver.resolve(RxStubRunner);
        await expectAsync(
            (await secondRxStubRunner.getObservableFromOtherRxStub(firstRxStubRunner, ['Work', 'Job'])).toPromise(),
        ).toBeResolvedTo('Job');
    });
}));

