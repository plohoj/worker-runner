import { IRunnerError } from '@core/actions/runner-error';
import { RunnerErrorCode, RunnerErrorMessages } from '@core/errors/runners-errors';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/Operators';
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
                (await rxStubRunner.emitMessages(['Work', 'Job'], emitDelay)).toPromise(),
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
            from(rxStubRunner.destroy()).pipe(switchMap(() => observable)).toPromise(),
        ).toBeRejectedWith(jasmine.objectContaining({
            errorCode: RunnerErrorCode.RUNNER_EXECUTE_INSTANCE_NOT_FOUND,
            message: RunnerErrorMessages.INSTANCE_NOT_FOUND,
        } as IRunnerError));
    });

    it('subscribe after destroy runner', async () => {
        const rxStubRunner = await rxResolver.resolve(RxStubRunner);
        const observable = await rxStubRunner.emitMessages([], 1000);
        await rxStubRunner.destroy();
        await expectAsync(observable.toPromise()).toBeRejectedWith(jasmine.objectContaining({
            errorCode: RunnerErrorCode.RUNNER_EXECUTE_INSTANCE_NOT_FOUND,
            message: RunnerErrorMessages.INSTANCE_NOT_FOUND,
        } as IRunnerError));
    });
});

