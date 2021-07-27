import { ResolvedRunner, ConnectionWasClosedError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { RxRunnerEmitError } from '@worker-runner/rx';
import { lastValueFrom } from 'rxjs';
import { rxLocalRunnerResolver, rxRunnerResolver } from '../client/resolver-list';
import { ExecutableStubRunner } from '../common/stubs/executable-stub.runner';
import { RxStubRunner } from '../common/stubs/rx-stub.runner';
import { each } from '../utils/each';
import { errorContaining } from '../utils/error-containing';
import { isIE } from '../utils/is-internet-explorer';

each({
    Rx: rxRunnerResolver,
    'Local Rx': rxLocalRunnerResolver as typeof rxRunnerResolver,
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
            lastValueFrom(await rxStubRunner.emitMessages(['Book', 'Pen'])),
        ).toBeResolvedTo('Pen');
        await rxStubRunner.destroy();
    });

    it('observable with delay', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const emitDelay = 19;
        await expectAsync(
            lastValueFrom(await rxStubRunner.emitMessages(['Work', 'Job'], emitDelay)),
        ).toBeResolvedTo('Job');
        await rxStubRunner.destroy();
    });

    it('subscribe and destroy runner', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitMessages([], 1000);
        rxStubRunner.destroy();
        await expectAsync(
            lastValueFrom(observable),
        ).toBeRejectedWith(errorContaining(ConnectionWasClosedError, {
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                token: RxStubRunner.name,
                runnerName: RxStubRunner.name,
            }),
            name: ConnectionWasClosedError.name,
            stack: jasmine.stringMatching(/.+/),
        }));
    });

    it('subscribe after destroy runner', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitMessages([], 1000);
        await rxStubRunner.destroy();
        await expectAsync(
            lastValueFrom(observable),
        ).toBeRejectedWith(errorContaining(ConnectionWasClosedError, {
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                token: RxStubRunner.name,
                runnerName: RxStubRunner.name,
            }),
            name: ConnectionWasClosedError.name,
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
        const executableStubRunner = await lastValueFrom(
            await rxStubRunner.resolveExecutableRunner(storageData)
        ) as ResolvedRunner<ExecutableStubRunner<typeof storageData>>;
        await expectAsync(executableStubRunner.getStage()).toBeResolvedTo(storageData);
    });

    it('emit error', async () => {
        const errorData = {
            id: 5166,
            type: 'ERROR',
        };
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const expectedProperty: Record<string, unknown> = {
            message: errorData.toString(),
            name: RxRunnerEmitError.name,
        };
        if (!isIE) {
            expectedProperty.stack = jasmine.stringMatching(/.+/);
        }
        await expectAsync(lastValueFrom(await rxStubRunner.emitError(errorData)))
            .toBeRejectedWith(errorContaining(RxRunnerEmitError, expectedProperty));
    });

    it('emit error after destroy runner', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitError();
        await rxStubRunner.destroy();
        await expectAsync(
            lastValueFrom(observable)
        ).toBeRejectedWith(errorContaining(ConnectionWasClosedError, {
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                token: RxStubRunner.name,
                runnerName: RxStubRunner.name,
            }),
            name: ConnectionWasClosedError.name,
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
            lastValueFrom(await secondRxStubRunner.getObservableFromOtherRxStub(firstRxStubRunner, ['Work', 'Job'])),
        ).toBeResolvedTo('Job');
    });
}));

