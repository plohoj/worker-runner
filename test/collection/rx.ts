import { ConnectionClosedError, ProxyReceiveConnectionChannelInterceptor, ResolvedRunner, RUNNER_ENVIRONMENT_CLIENT, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { RxRunnerEmitError, RX_WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/rx';
import { lastValueFrom, noop, Observable, NEVER, tap, of } from 'rxjs';
import { each } from '../client/utils/each';
import { errorContaining } from '../client/utils/error-containing';
import { isIE } from '../client/utils/is-internet-explorer';
import { pickResolverFactories } from '../client/utils/pick-resolver-factories';
import { ExecutableStubRunner } from '../common/stubs/executable-stub.runner';
import { RxStubRunner } from '../common/stubs/rx-stub.runner';

each(pickResolverFactories('Rx'), (mode, resolverFactory) =>
    describe(`${mode} Rx:`, () => {
        const resolver = resolverFactory();

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

        it('should pass Observable for Runner as argument', async () => {
            const message = 'stub:customMessage';
            const observable = of(message);
            const rxStubRunner = await resolver.resolve(RxStubRunner);

            const receivedMessage = await rxStubRunner.forwardObservableMessage(observable);

            expect(receivedMessage).toEqual(message);
        })
    })
);

each(pickResolverFactories('Rx', 'Local', 'Repeat'), (mode, resolverFactory) =>
    describe(`${mode} Rx:`, () => {
        const resolver = resolverFactory();

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
    })
);

each(pickResolverFactories('Rx', 'Local'), (mode, resolverFactory) =>
    describe(`${mode} Rx:`, () => {
        const resolver = resolverFactory();

        beforeAll(() => {
            resolver.run();
        });

        afterAll(async () => {
            await resolver.destroy();
        });

        it('should unsubscribe from original Observable', async () => {
            const subscribeSpy: jasmine.Spy<() => void> = jasmine.createSpy('subscribe');
            const unsubscribeSpy: jasmine.Spy<() => void> = jasmine.createSpy('unsubscribe');
            const rxUnsubscribeRunner = await resolver.resolve(class UnsubscribeRunnerStub {
                getObservable(): Observable<void> {
                    return NEVER.pipe(
                        tap({
                            subscribe: subscribeSpy,
                            unsubscribe: unsubscribeSpy,
                        })
                    );
                }
            });

            const observable = await rxUnsubscribeRunner.getObservable();
            observable.subscribe().unsubscribe();
            await rxUnsubscribeRunner.destroy();

            expect(subscribeSpy).toHaveBeenCalledOnceWith();
            expect(unsubscribeSpy).toHaveBeenCalledOnceWith();
        });

        it('should cancel receive Observable as an argument for non-existing method', async () => {
            class ObservableRunnerStub {
                subscribeToObservable(observable: Observable<void>): void {
                    observable.subscribe();
                }
            }
            const rxSubscribeRunner = await resolver.resolve(ObservableRunnerStub);
            Object.assign(ObservableRunnerStub.prototype, {
                subscribeToObservable: undefined,
            });
            function checkRxProxy(): boolean {
                const runnerActionController = rxSubscribeRunner[RUNNER_ENVIRONMENT_CLIENT]['actionController'];
                const interceptors = [...runnerActionController.connectionChannel.interceptorsComposer['interceptors']];
                return interceptors.some(interceptor => 
                    (interceptor as ProxyReceiveConnectionChannelInterceptor)['proxyData'][0] === 'rxId'
                );
            }

            expect(checkRxProxy()).withContext('before calling a non-existing method').toBeFalse();
            const promise$ = rxSubscribeRunner.subscribeToObservable(NEVER).catch(noop);
            expect(checkRxProxy()).withContext('after calling a non-existing method').toBeTrue();
            await promise$;
            expect(checkRxProxy()).withContext('after waiting for call to a non-existing method to complete').toBeFalse();
        });
    })
);
