import { ConnectEnvironmentErrorSerializer } from '../../connect/environment/connect-environment-error-serializer';
import { ConnectEnvironment } from '../../connect/environment/connect.environment';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ISerializedError, WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RunnerDestroyError, RunnerInitError, RunnerNotFound, HostResolverDestroyError } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { IRunnerEnvironmentConfig, RunnerEnvironment } from '../../runner/environment/runner.environment';
import { RunnersListController } from '../../runner/runner-bridge/runners-list.controller';
import { RunnerResolverPossibleConnection } from '../../types/possible-connection';
import { AvailableRunnersFromList, StrictRunnersList } from "../../types/runner-identifier";
import { IClientResolverInitRunnerAction, ClientResolverAction, IClientResolverAction, IClientResolverSoftInitRunnerAction } from '../client/client-resolver.actions';
import { HostResolverBridge } from '../resolver-bridge/host/host-resolver.bridge';
import { ArgumentsDeserializer, IArgumentsDeserializerConfig } from './arguments-deserializer';
import { IHostResolverAction, IHostResolverRunnerInitedAction, IHostResolverRunnerInitErrorAction, HostResolverAction, IHostResolverSoftRunnerInitedAction } from './host-resolver.actions';

export type IHostRunnerResolverConfigBase<L extends StrictRunnersList> = {
    connections?: RunnerResolverPossibleConnection[];
} & ({runners: L} | {runnersListController: RunnersListController<L>})

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
        this.runnersListController = 'runners' in config
            ? new RunnersListController({ runners: config.runners })
            : config.runnersListController;
        this.argumentsDeserializer = this.buildArgumentsDeserializer({
            runnersListController: this.runnersListController,
            errorSerializer: this.errorSerializer,
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
            case ClientResolverAction.SOFT_INIT_RUNNER:
                try {
                    return await this.initRunnerInstance(action);
                } catch (error) {
                    const errorAction: IHostResolverRunnerInitErrorAction = {
                        type: HostResolverAction.RUNNER_INIT_ERROR,
                        ... this.errorSerializer.serialize(error, new RunnerNotFound({
                            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                                token: action.token,
                                runnerName: this.runnersListController.getRunnerConstructorSoft(action.token)?.name,
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

    public wrapRunner(runnerInstance: InstanceType<AvailableRunnersFromList<L>>): MessagePort {
        const messageChanel = new MessageChannel();

        const runnerEnvironment = this.buildRunnerEnvironmentByPartConfig({
            token: this.runnersListController.getRunnerTokenByInstance(runnerInstance),
            runnerInstance,
            port: messageChanel.port1,
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
        action: IClientResolverInitRunnerAction | IClientResolverSoftInitRunnerAction,
    ): Promise<
        | IHostResolverRunnerInitErrorAction
        | IHostResolverSoftRunnerInitedAction
        | IHostResolverRunnerInitedAction
    > {
        const runnerConstructor = this.runnersListController.getRunnerConstructor(action.token);
        const messageChanel = new MessageChannel();
        // eslint-disable-next-line prefer-const
        let runnerEnvironment: RunnerEnvironment<AvailableRunnersFromList<L>> | undefined;
        // TODO move deserialize to Environment
        const deserializeArgumentsData = await this.argumentsDeserializer.deserializeArguments({
            args: action.args,
            // TODO Need test
            onRunnerControllerDestroyed:
                runnerController => runnerEnvironment?.runnerControllerDestroyedHandler(runnerController),
        });
        let runnerInstance: InstanceType<AvailableRunnersFromList<L>>;
        try {
            runnerInstance = new runnerConstructor(...deserializeArgumentsData.args) as InstanceType<AvailableRunnersFromList<L>>;
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

        runnerEnvironment = this.buildRunnerEnvironmentByPartConfig({
            token: action.token,
            runnerInstance,
            port: messageChanel.port1,
        });

        this.runnerEnvironments.add(runnerEnvironment);
        runnerEnvironment.addConnectedControllers(deserializeArgumentsData.controllers);
        const partOfResponseAction = {
            port: messageChanel.port2,
            transfer: [messageChanel.port2],
        }
        const responseAction = action.type === ClientResolverAction.SOFT_INIT_RUNNER
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

    private buildRunnerEnvironmentByPartConfig(
        config: Pick<IRunnerEnvironmentConfig<AvailableRunnersFromList<L>>, 'token' | 'port' | 'runnerInstance'>
    ): RunnerEnvironment<AvailableRunnersFromList<L>> {
        const runnerEnvironment = this.buildRunnerEnvironment({
            argumentsDeserializer: this.argumentsDeserializer,
            errorSerializer: this.errorSerializer,
            runnersListController: this.runnersListController,
            onDestroyed: () => this.runnerEnvironments.delete(runnerEnvironment),
            ...config,
        });
        return runnerEnvironment;
    }
}
