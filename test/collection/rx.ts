import { tap } from 'rxjs/Operators';
import { rxResolver } from 'test/common/rx';
import { RxMessageRunner } from 'test/common/rx-message-runner';

describe('RxJs', () => {

    beforeAll(async () => {
        await rxResolver.run();
    });

    afterAll(async () => {
        rxResolver.destroy();
    });

    it('simple observable', async () => {
        const observer = await rxResolver.resolve(RxMessageRunner);
        const result = await (await observer.send('test1', 'test2')).pipe(
            tap(message => console.log(message)),
        ).toPromise();
        expect(result).toBe('test2');
    });
});

