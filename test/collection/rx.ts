import { ConnectionClosedError, ResolvedRunner, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { RxRunnerEmitError, RX_WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/rx';
import { lastValueFrom, noop, Observable } from 'rxjs';
import { rxResolvers } from '../client/resolver-list';
import { ExecutableStubRunner } from '../common/stubs/executable-stub.runner';
import { RxStubRunner } from '../common/stubs/rx-stub.runner';
import { each } from '../utils/each';
import { errorContaining } from '../utils/error-containing';
import { isIE } from '../utils/is-internet-explorer';

each(rxResolvers, (mode, resolver) => describe(mode, () => {

    beforeAll(async () => {
        await resolver.run();
    });

    afterAll(async () => {
        await resolver.destroy();
    });

    it('should emit', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);

        const observable = await rxStubRunner.emitMessages(['Book', 'Pen'])

        await expectAsync(lastValueFrom(observable)).toBeResolvedTo('Pen');

        // destroy
        await rxStubRunner.destroy();
    });

    it('should emit with delay', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const emitDelay = 4;

        const observable = await rxStubRunner.emitMessages(['Work', 'Job'], emitDelay);

        await expectAsync(lastValueFrom(observable)).toBeResolvedTo('Job');

        // destroy
        await rxStubRunner.destroy();
    });

    it('should throw connection error on emit stream after destroying Runner', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);

        const observable = await rxStubRunner.emitMessages([], 7);
        await rxStubRunner.destroy();

        await expectAsync(
            lastValueFrom(observable),
        ).toBeRejectedWith(errorContaining(ConnectionClosedError, {
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                // token: RxStubRunner.name, // TODO Use Runner name in plugins for informative error messages
                // runnerName: RxStubRunner.name,
            }),
            name: ConnectionClosedError.name,
            stack: jasmine.stringMatching(/.+/),
        }));
    });

    it('should throw connection error on error stream after destroying Runner', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);

        const observable = await rxStubRunner.emitError();
        await rxStubRunner.destroy();

        await expectAsync(
            lastValueFrom(observable)
        ).toBeRejectedWith(errorContaining(ConnectionClosedError, {
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                // token: RxStubRunner.name,
                // runnerName: RxStubRunner.name,
            }),
            name: ConnectionClosedError.name,
            stack: jasmine.stringMatching(/.+/),
        }));
    });

    it('should emit Resolved Runner', async () => {
        const storageData = {
            id: 5136,
            type: 'STORAGE_DATA',
        };
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        await rxStubRunner.run();

        const observable = await rxStubRunner.resolveExecutableRunner(
            storageData
        ) as Observable<ResolvedRunner<ExecutableStubRunner<typeof storageData>>>;
        const executableStubRunner = await lastValueFrom(observable);

        await expectAsync(executableStubRunner.getStage()).toBeResolvedTo(storageData);
    });

    it('should emit error', async () => {
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

        const observable = await rxStubRunner.emitError(errorData);

        await expectAsync(lastValueFrom(observable))
            .toBeRejectedWith(errorContaining(RxRunnerEmitError, expectedProperty));
    });

    it('should retranslate emit from anther Runner stream', async () => {
        const firstRxStubRunner = await resolver.resolve(RxStubRunner);
        const secondRxStubRunner = await resolver.resolve(RxStubRunner);

        const observable = await secondRxStubRunner.getObservableFromOtherRxStub(firstRxStubRunner, ['Work', 'Job']);

        await expectAsync(lastValueFrom(observable)).toBeResolvedTo('Job');
    });

    it('should throw connection error after subscribing and then destroying Runner', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        
        const observable = await rxStubRunner.emitMessages([], 5);
        observable.subscribe({error: noop});
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        rxStubRunner.destroy();

        await expectAsync(
            lastValueFrom(observable),
        ).toBeRejectedWith(errorContaining(ConnectionClosedError, {
            message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                // token: RxStubRunner.name,
                // runnerName: RxStubRunner.name,
            }),
            name: ConnectionClosedError.name,
            stack: jasmine.stringMatching(/.+/),
        }));

        // destroy
        spyOn(console, 'error');
        await resolver.destroy();
        await resolver.run();
    });
}));

each({'Rx Local': rxResolvers['Rx Local']}, (mode, resolver) => describe(mode, () => {
    beforeAll(() => {
        resolver.run();
    });

    afterAll(async () => {
        await resolver.destroy();
    });

    it('should emit error before sync unsubscribe was called', async () => {
        const rxStubRunner = await resolver.resolve(RxStubRunner);
        const errorSpy = jasmine.createSpy();

        const observable = await rxStubRunner.emitError();
        observable.subscribe({error: errorSpy}).unsubscribe();

        expect(errorSpy).toHaveBeenCalledWith(errorContaining(RxRunnerEmitError, {
            name: RxRunnerEmitError.name,
            message: RX_WORKER_RUNNER_ERROR_MESSAGES.EMITTED_ERROR(),
        }));
    });
}));
