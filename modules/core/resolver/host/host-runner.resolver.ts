import { ConnectEnvironmentErrorSerializer } from '../../connect/environment/connect-environment-error-serializer';
import { ConnectEnvironment } from '../../connect/environment/connect.environment';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ISerializedError, WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RunnerDestroyError, RunnerInitError, RunnerNotFound, HostResolverDestroyError } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { IRunnerEnvironmentConfig, RunnerEnvironment } from '../../runner/environment/runner.environment';
import { RunnersListController } from '../../runner/runner-bridge/runners-list.controller';
import { RunnerResolverPossibleConnection } from '../../types/possible-connection';
import { AvailableRunnersFromList, RunnerToken, StrictRunnersList } from "../../types/runner-identifier";
import { IClientResolverInitRunnerAction, ClientResolverAction, IClientResolverAction, IClientResolverInitSoftRunnerAction } from '../client/client-resolver.actions';
import { HostResolverBridge } from '../resolver-bridge/host/host-resolver.bridge';
import { ArgumentsDeserializer, IArgumentsDeserializerConfig } from './arguments-deserializer';
import { IHostResolverAction, IHostResolverRunnerInitedAction, IHostResolverRunnerInitErrorAction, HostResolverAction, IHostResolverSoftRunnerInitedAction, IHostResolverRunnerDataResponseAction, IHostResolverRunnerDataResponseErrorAction } from './host-resolver.actions';

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

    protected readonly argumentsDeserializer: ArgumentsDeserializer<L>;

    constructor(config: IHostRunnerResolverConfigBase<L>) {
        this.runnersListController = new RunnersListController({ runners: config.runners });
        this.argumentsDeserializer = this.buildArgumentsDeserializer({
            runnersListController: this.runnersListController,
        });
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
            case ClientResolverAction.RUNNER_DATA_REQUEST:
                return this.getRunnerData(action.token);
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

    protected buildArgumentsDeserializer(config: IArgumentsDeserializerConfig<L>): ArgumentsDeserializer<L> {
        return new ArgumentsDeserializer<L>(config);
    }
    
    private getRunnerData(
        token: RunnerToken,
    ): IHostResolverRunnerDataResponseAction | IHostResolverRunnerDataResponseErrorAction {
        let responseAction: IHostResolverRunnerDataResponseAction;
        try {
            responseAction = {
                type: HostResolverAction.RUNNER_DATA_RESPONSE,
                methodsNames: this.runnersListController.getRunnerMethodsNames(token),
            };
        } catch (error) { // TODO Need test
            const responseErrorAction: IHostResolverRunnerDataResponseErrorAction = {
                type: HostResolverAction.RUNNER_DATA_RESPONSE_ERROR,
                ... this.errorSerializer.serialize(error, new RunnerNotFound({
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({
                        token: token,
                        runnerName: this.runnersListController.getRunnerSoft(token)?.name,
                    }),
                })),
            };
            return responseErrorAction;
        }
        return responseAction;
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
        // eslint-disable-next-line prefer-const
        let runnerEnvironment: RunnerEnvironment<AvailableRunnersFromList<L>>;
        const deserializeArgumentsData = this.argumentsDeserializer.deserializeArguments({
            args: action.args,
            // TODO Need test
            onRunnerControllerDestroyed:
                runnerController => runnerEnvironment.runnerControllerDestroyedHandler(runnerController),
        });
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

        runnerEnvironment = this.buildRunnerEnvironment({
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
                methodsNames: this.runnersListController.getRunnerMethodsNames(action.token),
            } as IHostResolverSoftRunnerInitedAction
            : {
                ...partOfResponseAction,
                type: HostResolverAction.RUNNER_INITED,
            } as IHostResolverRunnerInitedAction;
        return responseAction;
    }
}
