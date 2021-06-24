import { ConnectEnvironmentErrorSerializer } from '../../connect/environment/connect-environment-error-serializer';
import { ConnectEnvironment } from '../../connect/environment/connect.environment';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ISerializedError, WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RunnerDestroyError, RunnerInitError, RunnerNotFound, HostResolverDestroyError } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { IRunnerControllerConfig, RunnerController } from '../../runner/controller/runner.controller';
import { IRunnerEnvironmentConfig, RunnerEnvironment } from '../../runner/environment/runner.environment';
import { RunnersListController } from '../../runner/runner-bridge/runners-list.controller';
import { RunnerResolverPossibleConnection } from '../../types/possible-connection';
import { AvailableRunnersFromList, StrictRunnersList, RunnerToken } from "../../types/runner-token";
import { IClientResolverInitRunnerAction, ClientResolverAction, IClientResolverAction, IClientResolverInitSoftRunnerAction } from '../client/client-resolver.actions';
import { HostResolverBridge } from '../resolver-bridge/host/host-resolver.bridge';
import { ArgumentsDeserializer } from './arguments-deserializer';
import { IHostResolverAction, IHostResolverRunnerInitedAction, IHostResolverRunnerInitErrorAction, HostResolverAction, IHostResolverSoftRunnerInitedAction } from './host-resolver.actions';

export interface IHostRunnerResolverConfigBase<L extends StrictRunnersList> {
    runners: L;
    connections?: RunnerResolverPossibleConnection[];
}

export abstract class HostRunnerResolverBase<L extends StrictRunnersList> {
    
    protected runnerEnvironments = new Set<RunnerEnvironment<AvailableRunnersFromList<L>>>();
    protected resolverBridge: HostResolverBridge;
    
    protected readonly runnersListController: RunnersListController<L>;
    protected readonly errorSerializer = this.buildWorkerErrorSerializer();
    protected readonly newConnectionHandler = this.handleNewConnection.bind(this);
    protected readonly connectEnvironment = new ConnectEnvironment({
        destroyErrorSerializer: this.destroyErrorSerializer.bind(this) as ConnectEnvironmentErrorSerializer,
        actionsHandler: this.handleAction.bind(this),
        destroyHandler: this.onAllDisconnect.bind(this),
    });
    protected readonly runnerControllerPartFactory = this.buildRunnerControllerByPartConfig.bind(this);
    protected readonly argumentsDeserializer = new ArgumentsDeserializer<AvailableRunnersFromList<L>>({
        runnerControllerPartFactory: this.runnerControllerPartFactory,
    });

    constructor(config: IHostRunnerResolverConfigBase<L>) {
        this.runnersListController = new RunnersListController(config);
        this.resolverBridge = new HostResolverBridge({
            newConnectionHandler: this.newConnectionHandler,
            connections: config.connections
                ? [...config.connections]
                : [self],
        });
    }

    public run(): void {
        this.resolverBridge.run();
    }

    public addConnections(connections: RunnerResolverPossibleConnection[]): void {
        this.resolverBridge.addConnections(connections);
    }

    public removeConnections(connections: RunnerResolverPossibleConnection[]): void {
        this.resolverBridge.removeConnections(connections);
    }

    public async handleAction(action: IClientResolverAction): Promise<IHostResolverAction> {
        switch (action.type) {
            case ClientResolverAction.INIT_RUNNER:
            case ClientResolverAction.INIT_SOFT_RUNNER:
                try {
                    return await this.initRunnerInstance(action);
                } catch (error) {
                    const errorAction: IHostResolverRunnerInitErrorAction = {
                        type: HostResolverAction.RUNNER_INIT_ERROR,
                        ... this.errorSerializer.serialize(error, new RunnerNotFound({
                            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                                token: action.token,
                                runnerName: this.runnersListController.getRunnerSoft(action.token)?.name,
                            }),
                        })),
                    };
                    return errorAction;
                }
            default:
                throw new WorkerRunnerUnexpectedError({
                    message: 'Unexpected Action type for Host Runner Resolver',
                });
        }
    }

    public async destroy(): Promise<void> {
        if (!this.resolverBridge.isRunning) {
            throw new WorkerRunnerUnexpectedError({
                message: 'Host Runner Resolver was caused to be destroyed but did not start previously.',
            });
        }
        await this.clearEnvironment();
        this.resolverBridge.destroy();
    }

    public wrapRunner(runner: InstanceType<AvailableRunnersFromList<L>>): MessagePort {
        const messageChanel = new MessageChannel();

        const runnerEnvironment: RunnerEnvironment<AvailableRunnersFromList<L>> = this.buildRunnerEnvironment({
            token: this.runnersListController.getRunnerTokenByInstance(runner),
            runner,
            port: messageChanel.port1,
            errorSerializer: this.errorSerializer,
            argumentsDeserializer: this.argumentsDeserializer,
            onDestroyed: () => this.runnerEnvironments.delete(runnerEnvironment),
        });

        this.runnerEnvironments.add(runnerEnvironment);
        return messageChanel.port2;
    }

    protected buildRunnerEnvironment(
        config: IRunnerEnvironmentConfig<AvailableRunnersFromList<L>>
    ): RunnerEnvironment<AvailableRunnersFromList<L>> {
        return new RunnerEnvironment(config);
    }

    protected buildWorkerErrorSerializer(): WorkerRunnerErrorSerializer {
        return WORKER_RUNNER_ERROR_SERIALIZER;
    }

    protected buildRunnerControllerByPartConfig(config: {
        token: RunnerToken,
        port: MessagePort,
    }): RunnerController<AvailableRunnersFromList<L>> {
        const runnerBridgeConstructor = this.runnersListController.getRunnerBridgeConstructor(config.token);
        const originalRunnerName = this.runnersListController.getRunner(config.token).name;
        return this.buildRunnerController({
            ...config,
            runnerBridgeConstructor,
            originalRunnerName,
            runnerControllerPartFactory: this.runnerControllerPartFactory,
        });
    }

    protected buildRunnerController(
        config: IRunnerControllerConfig<AvailableRunnersFromList<L>>
    ): RunnerController<AvailableRunnersFromList<L>> {
        return new RunnerController(config);
    }

    private async onAllDisconnect(): Promise<void> {
        await this.clearEnvironment();
    }

    private async clearEnvironment(): Promise<void> {
        const destroyErrors = new Array<ISerializedError>();
        const destroying$ = new Array<Promise<void>>();
        for (const runnerEnvironment of this.runnerEnvironments) {
            destroying$.push(
                runnerEnvironment.handleDestroy().catch(error => {
                    destroyErrors.push(this.errorSerializer.serialize(error, new RunnerDestroyError({
                        message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR({
                            token: runnerEnvironment.token,
                            runnerName: runnerEnvironment.runnerName,
                        }),
                    })));
                }),
            );
        }
        await Promise.all(destroying$);
        this.runnerEnvironments.clear();
        if (destroyErrors.length > 0) {
            throw new HostResolverDestroyError({ // TODO need test
                originalErrors: destroyErrors,
            });
        }
    }
    private handleNewConnection(port: MessagePort): void {
        this.connectEnvironment.addPort(port);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private destroyErrorSerializer(error: any): ISerializedError {
        return this.errorSerializer.serialize(error, new HostResolverDestroyError());
    }
    
    private async initRunnerInstance(
        action: IClientResolverInitRunnerAction | IClientResolverInitSoftRunnerAction,
    ): Promise<
        | IHostResolverRunnerInitErrorAction
        | IHostResolverSoftRunnerInitedAction
        | IHostResolverRunnerInitedAction
    > {
        const runnerConstructor = this.runnersListController.getRunner(action.token);
        const messageChanel = new MessageChannel();
        const deserializeArgumentsData = this.argumentsDeserializer.deserializeArguments(action.args);
        let runner: InstanceType<AvailableRunnersFromList<L>>;
        try {
            runner = new runnerConstructor(...deserializeArgumentsData.args) as InstanceType<AvailableRunnersFromList<L>>;
        } catch (error) {
            await Promise.all(deserializeArgumentsData.controllers
                .map(controller => controller.disconnect()));
            throw this.errorSerializer.deserialize(this.errorSerializer.serialize(error, new RunnerInitError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                    token: action.token,
                    runnerName: runnerConstructor.name,
                }),
            })));
        }

        const runnerEnvironment: RunnerEnvironment<AvailableRunnersFromList<L>> = this.buildRunnerEnvironment({
            token: action.token,
            runner,
            port: messageChanel.port1,
            errorSerializer: this.errorSerializer,
            argumentsDeserializer: this.argumentsDeserializer,
            onDestroyed: () => this.runnerEnvironments.delete(runnerEnvironment),
        });

        this.runnerEnvironments.add(runnerEnvironment);
        runnerEnvironment.addConnectedControllers(deserializeArgumentsData.controllers);
        const partOfResponseAction = {
            port: messageChanel.port2,
            transfer: [messageChanel.port2],
        }
        const responseAction = action.type === ClientResolverAction.INIT_SOFT_RUNNER
            ? {
                ...partOfResponseAction,
                type: HostResolverAction.SOFT_RUNNER_INITED,
                methodNames: this.runnersListController.getRunnerMethodsNames(action.token),
            } as IHostResolverSoftRunnerInitedAction
            : {
                ...partOfResponseAction,
                type: HostResolverAction.RUNNER_INITED,
            } as IHostResolverRunnerInitedAction;
        return responseAction;
    }
}
