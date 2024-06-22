import { ConnectionClosedError, DisconnectReason, HeartbeatAction, HeartbeatInterceptPlugin, IAction, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';
import { filter, fromEvent, lastValueFrom, noop, take } from 'rxjs';
import { each } from '../client/utils/each';
import { errorContaining } from '../client/utils/error-containing';
import { pickApartResolverFactories } from '../client/utils/pick-apart-resolver-factories';
import { EXECUTABLE_STUB_RUNNER_TOKEN, ExecutableStubRunner } from '../common/stubs/executable-stub.runner';

async function waitHeartbeatPulseAction(port: MessagePort): Promise<void> {
    await lastValueFrom(
        fromEvent<MessageEvent<IAction>>(port, 'message').pipe(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
            filter(event => event.data.type === HeartbeatAction.HeartbeatPulse),
            take(1),
        )
    );
}

each(pickApartResolverFactories(), (mode, resolverFactory) => 
    describe(`${mode} HeartbeatInterceptPlugin:`, () => {

        beforeEach(() => {
            jasmine.clock().install();
        });

        afterEach(() => {
            jasmine.clock().uninstall();
        })

        it('should throw disconnect error when client was silent before resolving runner', async () => {
            const apartResolversManager = resolverFactory({
                clientConfig: {
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                    })]
                },
                hostConfig: {
                    runners: [],
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                    })]
                }
            });
            await apartResolversManager.run();

            spyOn(apartResolversManager.clientPort, 'postMessage');
            jasmine.clock().tick(6);

            await expectAsync(apartResolversManager.client.resolve(ExecutableStubRunner))
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    disconnectReason: DisconnectReason.ConnectionLost,
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                        disconnectReason: DisconnectReason.ConnectionLost
                    }),
                    name: ConnectionClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));

            // Destroying errors are expected because the connection was lost
            await apartResolversManager.destroy().catch(noop);
        });

        it('should throw disconnect error when client was silent during execute method', async () => {
            const apartResolversManager = resolverFactory({
                clientConfig: {
                    runners: [{
                        runner: ExecutableStubRunner,
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                    }],
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                    })]
                },
                hostConfig: {
                    runners: [{
                        runner: ExecutableStubRunner,
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                    }],
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                    })]
                }
            });
            await apartResolversManager.run();

            const runner = await apartResolversManager.client.resolve(EXECUTABLE_STUB_RUNNER_TOKEN);
            spyOn(apartResolversManager.clientPort, 'postMessage');
            const executeResult$ = runner.delay(10);
            jasmine.clock().tick(6);

            await expectAsync(executeResult$)
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    disconnectReason: DisconnectReason.ConnectionLost,
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                        disconnectReason: DisconnectReason.ConnectionLost,
                        runnerName: ExecutableStubRunner.name,
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                    }),
                    name: ConnectionClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));

            // Destroying errors are expected because the connection was lost
            await apartResolversManager.destroy().catch(noop);
        });

        it('should throw disconnect error when host was silent before resolving runner', async () => {
            const apartResolversManager = resolverFactory({
                clientConfig: {
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                    })]
                },
                hostConfig: {
                    runners: [],
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                    })]
                }
            });
            await apartResolversManager.run();

            spyOn(apartResolversManager.hostPort, 'postMessage');
            jasmine.clock().tick(6);

            await expectAsync(apartResolversManager.client.resolve(ExecutableStubRunner))
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    disconnectReason: DisconnectReason.ConnectionLost,
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                        disconnectReason: DisconnectReason.ConnectionLost
                    }),
                    name: ConnectionClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));
            
            // Destroying errors are expected because the connection was lost
            await apartResolversManager.destroy().catch(noop);
        });

        it('should throw disconnect error when host was silent during execute method', async () => {
            const apartResolversManager = resolverFactory({
                clientConfig: {
                    runners: [{
                        runner: ExecutableStubRunner,
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                    }],
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                    })]
                },
                hostConfig: {
                    runners: [{
                        runner: ExecutableStubRunner,
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                    }],
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                    })]
                }
            });
            await apartResolversManager.run();

            const runner = await apartResolversManager.client.resolve(EXECUTABLE_STUB_RUNNER_TOKEN);
            spyOn(apartResolversManager.hostPort, 'postMessage');
            const executeResult$ = runner.delay(10);
            jasmine.clock().tick(6);

            await expectAsync(executeResult$)
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    disconnectReason: DisconnectReason.ConnectionLost,
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                        disconnectReason: DisconnectReason.ConnectionLost,
                        runnerName: ExecutableStubRunner.name,
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                    }),
                    name: ConnectionClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));

            // Destroying errors are expected because the connection was lost
            await apartResolversManager.destroy().catch(noop);
        });

        it('should throw disconnect error when client and host was silent before resolving runner', async () => {
            const apartResolversManager = resolverFactory({
                clientConfig: {
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                    })]
                },
                hostConfig: {
                    runners: [],
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                    })]
                }
            });
            await apartResolversManager.run();

            spyOn(apartResolversManager.clientPort, 'postMessage');
            spyOn(apartResolversManager.hostPort, 'postMessage');
            jasmine.clock().tick(6);

            await expectAsync(apartResolversManager.client.resolve(ExecutableStubRunner))
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    disconnectReason: DisconnectReason.ConnectionLost,
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                        disconnectReason: DisconnectReason.ConnectionLost
                    }),
                    name: ConnectionClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));

            // Destroying errors are expected because the connection was lost
            await apartResolversManager.destroy().catch(noop);
        });

        it('should throw disconnect error when client and host was silent during execute method', async () => {
            const apartResolversManager = resolverFactory({
                clientConfig: {
                    runners: [{
                        runner: ExecutableStubRunner,
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                    }],
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                    })]
                },
                hostConfig: {
                    runners: [{
                        runner: ExecutableStubRunner,
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                    }],
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                    })]
                }
            });
            await apartResolversManager.run();

            const runner = await apartResolversManager.client.resolve(EXECUTABLE_STUB_RUNNER_TOKEN);
            spyOn(apartResolversManager.clientPort, 'postMessage');
            spyOn(apartResolversManager.hostPort, 'postMessage');
            const executeResult$ = runner.delay(10);
            jasmine.clock().tick(6);

            await expectAsync(executeResult$)
                .toBeRejectedWith(errorContaining(ConnectionClosedError, {
                    disconnectReason: DisconnectReason.ConnectionLost,
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_CLOSED({
                        disconnectReason: DisconnectReason.ConnectionLost,
                        runnerName: ExecutableStubRunner.name,
                        token: EXECUTABLE_STUB_RUNNER_TOKEN,
                    }),
                    name: ConnectionClosedError.name,
                    stack: jasmine.stringMatching(/.+/),
                }));

            // Destroying errors are expected because the connection was lost
            await apartResolversManager.destroy().catch(noop);
        });

        it('should call disconnect callback when client and host was silent', async () => {
            const clientDisconnectCallbackSpy = jasmine.createSpy('client disconnect callback');
            const hostDisconnectCallbackSpy = jasmine.createSpy('host disconnect callback');
            const apartResolversManager = resolverFactory({
                clientConfig: {
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                        onConnectionLost: clientDisconnectCallbackSpy,
                    })]
                },
                hostConfig: {
                    runners: [],
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                        onConnectionLost: hostDisconnectCallbackSpy,
                    })]
                }
            });
            await apartResolversManager.run();

            spyOn(apartResolversManager.clientPort, 'postMessage');
            spyOn(apartResolversManager.hostPort, 'postMessage');
            jasmine.clock().tick(6);

            expect(clientDisconnectCallbackSpy).toHaveBeenCalledOnceWith();
            expect(hostDisconnectCallbackSpy).toHaveBeenCalledOnceWith();

            // Destroying errors are expected because the connection was lost
            await apartResolversManager.destroy().catch(noop);
        });

        it('should call disconnect callback when client was silent ', async () => {
            const clientDisconnectCallbackSpy = jasmine.createSpy('client disconnect callback');
            const hostDisconnectCallbackSpy = jasmine.createSpy('host disconnect callback');
            const apartResolversManager = resolverFactory({
                clientConfig: {
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                        onConnectionLost: clientDisconnectCallbackSpy,
                    })]
                },
                hostConfig: {
                    runners: [],
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                        onConnectionLost: hostDisconnectCallbackSpy,
                    })]
                }
            });
            await apartResolversManager.run();

            spyOn(apartResolversManager.clientPort, 'postMessage');
            jasmine.clock().tick(3);
            await waitHeartbeatPulseAction(apartResolversManager.clientPort);
            jasmine.clock().tick(3);

            expect(clientDisconnectCallbackSpy).not.toHaveBeenCalled();
            expect(hostDisconnectCallbackSpy).toHaveBeenCalledOnceWith();

            jasmine.clock().tick(3);
            await waitHeartbeatPulseAction(apartResolversManager.clientPort);
            jasmine.clock().tick(3);
            
            expect(clientDisconnectCallbackSpy).toHaveBeenCalledOnceWith();
            expect(hostDisconnectCallbackSpy).toHaveBeenCalledOnceWith();

            // Destroying errors are expected because the connection was lost
            await apartResolversManager.destroy().catch(noop);
        });

        it('should call disconnect callback when host was silent ', async () => {
            const clientDisconnectCallbackSpy = jasmine.createSpy('client disconnect callback');
            const hostDisconnectCallbackSpy = jasmine.createSpy('host disconnect callback');
            const apartResolversManager = resolverFactory({
                clientConfig: {
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                        onConnectionLost: clientDisconnectCallbackSpy,
                    })]
                },
                hostConfig: {
                    runners: [],
                    plugins: [new HeartbeatInterceptPlugin({
                        sendInterval: 1,
                        receiveTimeout: 5,
                        onConnectionLost: hostDisconnectCallbackSpy,
                    })]
                }
            });
            await apartResolversManager.run();

            spyOn(apartResolversManager.hostPort, 'postMessage');
            jasmine.clock().tick(3);
            await waitHeartbeatPulseAction(apartResolversManager.hostPort);
            jasmine.clock().tick(3);

            expect(clientDisconnectCallbackSpy).toHaveBeenCalledOnceWith();
            expect(hostDisconnectCallbackSpy).not.toHaveBeenCalled();

            jasmine.clock().tick(3);
            await waitHeartbeatPulseAction(apartResolversManager.hostPort);
            jasmine.clock().tick(3);

            expect(clientDisconnectCallbackSpy).toHaveBeenCalledOnceWith();
            expect(hostDisconnectCallbackSpy).toHaveBeenCalledOnceWith();

            // Destroying errors are expected because the connection was lost
            await apartResolversManager.destroy().catch(noop);
        });
    })
);
