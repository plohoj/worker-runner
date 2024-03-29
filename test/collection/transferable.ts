import { TransferRunnerData } from '@worker-runner/core';
import { allResolvers } from '../client/resolver-list';
import { WithTransferableRunnerStub } from '../common/stubs/with-transferable-data.stub';
import { each } from '../utils/each';

each(allResolvers, (mode, resolver) =>
    describe(`${mode} Transfer data`, () => {

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('by constructor', async () => {
            const int8Array = new Int8Array(1);
            const initialNumber = 13;
            int8Array[0] = initialNumber;
            const withTransferableRunnerStub = await resolver.resolve(WithTransferableRunnerStub,
                new TransferRunnerData(int8Array.buffer, [int8Array.buffer]));
            try {
                expect(int8Array[0]).toBeUndefined();
            // eslint-disable-next-line no-empty
            } catch {}
            expect(int8Array.length).toBe(0);
            const arrayBuffer = await withTransferableRunnerStub.transferArrayBuffer();
            const int8ArrayResponse = new Int8Array(arrayBuffer);
            expect(int8ArrayResponse[0]).toBe(initialNumber);
            expect(int8ArrayResponse.length).toBe(1);
        });

        it('by arguments', async () => {
            const int8Array = new Int8Array(1);
            const initialNumber = 11;
            int8Array[0] = initialNumber;
            const withTransferableRunnerStub = await resolver.resolve(WithTransferableRunnerStub);
            await withTransferableRunnerStub
                .setArrayBuffer(new TransferRunnerData(int8Array.buffer, [int8Array.buffer]));
            try {
                expect(int8Array[0]).toBeUndefined();
            // eslint-disable-next-line no-empty
            } catch {}
            expect(int8Array.length).toBe(0);
            const arrayBuffer = await withTransferableRunnerStub.transferArrayBuffer();
            const int8ArrayResponse = new Int8Array(arrayBuffer);
            expect(int8ArrayResponse[0]).toBe(initialNumber);
            expect(int8ArrayResponse.length).toBe(1);
        });
    }),
);

