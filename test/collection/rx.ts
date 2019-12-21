import { rxResolver } from 'test/common/rx';
import { RxMessageRunner } from 'test/common/rx-message-runner';

describe('Rx', () => {

    beforeAll(async () => {
        await rxResolver.run();
    });

    afterAll(async () => {
        rxResolver.destroy();
    });

    it('simple observable', async () => {
        const observer = await rxResolver.resolve(RxMessageRunner);
        const result = await (await observer.send('test1', 'test2')).toPromise();
        expect(result).toBe('test2');
    });
});

