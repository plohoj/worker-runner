import { IRxRunnerError, RxRunnerErrorCode, RxRunnerErrorMessages } from '@modules/rxjs/runners-errors';
import { from } from 'rxjs';
import { delayWhen } from 'rxjs/Operators';
import { rxResolver } from 'test/common/rx';
import { RxStubRunner } from 'test/common/stubs/rx-stub.runner';
import { waitTimeout } from 'test/utils/wait-timeout';

describe('Rx', () => {

    beforeAll(async () => {
        await rxResolver.run();
    });

    afterAll(async () => {
        rxResolver.destroy();
    });

    it('simple observable', async () => {
        const rxStubRunner = await rxResolver.resolve(RxStubRunner);
        await expectAsync(
            (await rxStubRunner.emitMessages(['Book', 'Pen'])).toPromise(),
        ).toBeResolvedTo('Pen');
        await rxStubRunner.destroy();
    });

    it('observable with delay', async () => {
        const rxStubRunner = await rxResolver.resolve(RxStubRunner);
        const emitDelay = 19;
        await waitTimeout(
            expectAsync(
                (await (await rxStubRunner.emitMessages(['Work', 'Job'], emitDelay))).toPromise(),
            ).toBeResolvedTo('Job'),
            emitDelay + 125,
            emitDelay,
        );
        await rxStubRunner.destroy();
    });

    it('subscribe and destroy runner', async () => {
        const rxStubRunner = await rxResolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitMessages([], 1000);
        await expectAsync(
            observable.pipe(delayWhen(() => from(rxStubRunner.destroy()))).toPromise(),
        ).toBeRejectedWith(jasmine.objectContaining({
                errorCode: RxRunnerErrorCode.RUNNER_WAS_DESTROYED,
                message: RxRunnerErrorMessages.RUNNER_WAS_DESTROYED,
            } as IRxRunnerError),
        );
    });

    it('subscribe after destroy runner', async () => {
        const rxStubRunner = await rxResolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitMessages([], 1000);
        await rxStubRunner.destroy();
        await expectAsync(observable.toPromise()).toBeRejectedWith(jasmine.objectContaining({
                errorCode: RxRunnerErrorCode.RUNNER_WAS_DESTROYED,
                message: RxRunnerErrorMessages.RUNNER_WAS_DESTROYED,
            } as IRxRunnerError),
        );
    });
});

