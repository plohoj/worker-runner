import { ResolvedRunner, RunnerDestroyError, ConnectionWasClosedError, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { RxLocalRunnerResolver } from '@worker-runner/rx';
import { resolverList } from 'test/common/resolver-list';
import { EXECUTABLE_STUB_RUNNER_TOKEN } from 'test/common/runner-list';
import { ErrorStubRunner } from 'test/common/stubs/error-stub.runner';
import { ExecutableStubRunner } from 'test/common/stubs/executable-stub.runner';
import { WithOtherInstanceStubRunner } from 'test/common/stubs/with-other-instance-stub.runner';
import { each } from 'test/utils/each';
import { errorContaining } from 'test/utils/error-containing';

each(resolverList, (mode, resolver) =>
    describe(`${mode} destroy runner`, () => {

        beforeAll(async () => {
            await resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it ('simple', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            const destroyData = await executableStubRunner.destroy();
            expect(destroyData).toBe(undefined);
        });

        it ('with exception in method', async () => {
            const errorStubRunner = await resolver.resolve(ErrorStubRunner);
            await expectAsync(errorStubRunner.destroy()).toBeRejectedWith(errorContaining(RunnerDestroyError, {
                message: 'DESTROY_EXCEPTION',
                name: Error.name,
                stack: jasmine.stringMatching(/.+/),
            }));
        });

        it ('which is used', async () => {
            const executableStubRunner = await resolver
                .resolve(ExecutableStubRunner) as ResolvedRunner<ExecutableStubRunner>;
            const withOtherInstanceStubRunner = await resolver
                .resolve(WithOtherInstanceStubRunner, executableStubRunner) as ResolvedRunner<
                    WithOtherInstanceStubRunner>;
            await executableStubRunner.destroy();
            await expectAsync(withOtherInstanceStubRunner.getInstanceStage())
                .toBeRejectedWith(errorContaining(ConnectionWasClosedError, {
                    name: ConnectionWasClosedError.name,
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    stack: jasmine.stringMatching(/.+/),
                }));
        });

        it ('destroyed runner', async () => {
            const executableStubRunner = await resolver.resolve(ExecutableStubRunner);
            await executableStubRunner.destroy();
            await expectAsync(executableStubRunner.destroy())
                .toBeRejectedWith(errorContaining(ConnectionWasClosedError, {
                    name: ConnectionWasClosedError.name,
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                        runnerName: ExecutableStubRunner.name,
                    }),
                    stack: jasmine.stringMatching(/.+/),
                }));
        });
    }),
);

describe(`Local destroy runner`, () => {
    it ('with extended method', async () => {
        class DestroyableRunner {
            public destroy(): void {/* stub */}
        }
        const destroySpy = spyOn(DestroyableRunner.prototype, 'destroy');
        const localResolver = new LocalRunnerResolver({ runners: [DestroyableRunner] });
        await localResolver.run();
        const destroyableRunner = await localResolver.resolve(DestroyableRunner);
        await destroyableRunner.destroy();
        expect(destroySpy).toHaveBeenCalled();
        await localResolver.destroy();
    });
});

each({
        Local: LocalRunnerResolver,
        'Rx Local': RxLocalRunnerResolver as unknown as typeof LocalRunnerResolver,
    },
    (mode, IterateLocalRunnerResolver) => describe(`${mode} Local destroy runner`, () => {
        it ('with extended method', async () => {
            class DestroyableRunner {
                public destroy(): void {
                    // stub
                }
            }
            const destroySpy = spyOn(DestroyableRunner.prototype, 'destroy');
            const localResolver = new IterateLocalRunnerResolver({ runners: [DestroyableRunner] });
            await localResolver.run();
            const destroyableRunner = await localResolver.resolve(DestroyableRunner);
            await destroyableRunner.destroy();
            expect(destroySpy).toHaveBeenCalled();
            await localResolver.destroy();
        });
    }),
);
