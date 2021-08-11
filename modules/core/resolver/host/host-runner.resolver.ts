import { ConnectEnvironmentErrorSerializer } from '../../connect/environment/connect-environment-error-serializer';
import { ConnectEnvironment } from '../../connect/environment/connect.environment';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ISerializedError, WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RunnerDestroyError, RunnerInitError, HostResolverDestroyError } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { IRunnerEnvironmentConfig, RunnerEnvironment } from '../../runner/environment/runner.environment';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { RunnerResolverPossibleConnection } from '../../types/possible-connection';
import { AvailableRunnersFromList, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { IClientResolverInitRunnerAction, ClientResolverAction, IClientResolverAction, IClientResolverSoftInitRunnerAction } from '../client/client-resolver.actions';
import { HostResolverBridge } from '../resolver-bridge/host/host-resolver.bridge';
import { IHostResolverAction, IHostResolverRunnerInitedAction, IHostResolverRunnerInitErrorAction, HostResolverAction, IHostResolverSoftRunnerInitedAction } from './host-resolver.actions';

export type IHostRunnerResolverConfigBase<L extends RunnerIdentifierConfigList> = {
    connections?: RunnerResolverPossibleConnection[];
} & ({runners: L} | {runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>})

export abstract class HostRunnerResolverBase<L extends RunnerIdentifierConfigList> {
    
    protected runnerEnvironments = new Set<RunnerEnvironment<AvailableRunnersFromList<L>>>();
    protected resolverBridge: HostResolverBridge;
    
    protected readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    protected readonly errorSerializer = this.buildWorkerErrorSerializer();
    protected readonly newConnectionHandler = this.handleNewConnection.bind(this);
    protected readonly connectEnvironment = new ConnectEnvironment({
        destroyErrorSerializer: this.destroyErrorSerializer.bind(this) as ConnectEnvironmentErrorSerializer,
        actionsHandler: this.handleAction.bind(this),
        destroyHandler: this.onAllDisconnect.bind(this),
    });

    constructor(config: IHostRunnerResolverConfigBase<L>) {
        this.runnerIdentifierConfigCollection = 'runners' in config
            ? new RunnerIdentifierConfigCollection({ runners: config.runners })
            : config.runnerIdentifierConfigCollection;
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
                        ... this.errorSerializer.serialize(error, new RunnerInitError({
                            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                                token: action.token,
                                runnerName: this.runnerIdentifierConfigCollection
                                    .getRunnerConstructorSoft(action.token)?.name,
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
            token: this.runnerIdentifierConfigCollection.getRunnerTokenByInstance(runnerInstance),
            port: messageChanel.port1,
        });
        runnerEnvironment.initSync({ runnerInstance });

        this.runnerEnvironments.add(runnerEnvironment);
        return messageChanel.port2;
    }

    protected buildRunnerEnvironment(
        config: IRunnerEnvironmentConfig
    ): RunnerEnvironment<AvailableRunnersFromList<L>> {
        return new RunnerEnvironment(config);
    }

    protected buildWorkerErrorSerializer(): WorkerRunnerErrorSerializer {
        return WORKER_RUNNER_ERROR_SERIALIZER;
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
        const messageChanel = new MessageChannel();
        const runnerEnvironment = this.buildRunnerEnvironmentByPartConfig({
            token: action.token,
            port: messageChanel.port1,
        });
        await runnerEnvironment.initAsync({ arguments: action.args });
        this.runnerEnvironments.add(runnerEnvironment);

        const partOfResponseAction = {
            port: messageChanel.port2,
            transfer: [messageChanel.port2],
        }
        const responseAction = action.type === ClientResolverAction.SOFT_INIT_RUNNER
            ? {
                ...partOfResponseAction,
                type: HostResolverAction.SOFT_RUNNER_INITED,
                methodsNames: this.runnerIdentifierConfigCollection.getRunnerMethodsNames(action.token),
            } as IHostResolverSoftRunnerInitedAction
            : {
                ...partOfResponseAction,
                type: HostResolverAction.RUNNER_INITED,
            } as IHostResolverRunnerInitedAction;
        return responseAction;
    }

    private buildRunnerEnvironmentByPartConfig(
        config: Pick<IRunnerEnvironmentConfig, 'token' | 'port'>
    ): RunnerEnvironment<AvailableRunnersFromList<L>> {
        const runnerEnvironment = this.buildRunnerEnvironment({
            errorSerializer: this.errorSerializer,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            onDestroyed: () => this.runnerEnvironments.delete(runnerEnvironment),
            ...config,
        });
        return runnerEnvironment;
    }
}
