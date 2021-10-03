import { ConnectHost } from '../../connect/host/connect.host';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RunnerInitError, HostResolverDestroyError } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { IRunnerEnvironmentHostConfig, RunnerEnvironmentHost } from '../../runner-environment/host/runner-environment.host';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { RunnerResolverPossibleConnection } from '../../types/possible-connection';
import { AvailableRunnersFromList, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { allPromisesCollectErrors } from '../../utils/all-promises-collect-errors';
import { IClientResolverInitRunnerAction, ClientResolverAction, IClientResolverAction, IClientResolverSoftInitRunnerAction } from '../client/client-resolver.actions';
import { HostResolverBridge } from '../resolver-bridge/host/host-resolver.bridge';
import { IHostResolverAction, IHostResolverRunnerInitedAction, HostResolverAction, IHostResolverSoftRunnerInitedAction } from './host-resolver.actions';

export type IHostRunnerResolverConfigBase<L extends RunnerIdentifierConfigList> = {
    connections?: RunnerResolverPossibleConnection[];
} & ({runners: L} | {runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>})

export abstract class HostRunnerResolverBase<L extends RunnerIdentifierConfigList> {
    
    protected runnerEnvironmentHosts = new Set<RunnerEnvironmentHost<AvailableRunnersFromList<L>>>();
    protected resolverBridge: HostResolverBridge;
    
    protected readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;
    protected readonly errorSerializer = this.buildWorkerErrorSerializer();
    protected readonly newConnectionHandler = this.handleNewConnection.bind(this);
    protected readonly connectHost = new ConnectHost({
        errorSerializer: this.errorSerializer,
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
                return await this.initRunnerInstance(action);
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

        const runnerEnvironmentHost = this.buildRunnerEnvironmentHostByPartConfig({
            token: this.runnerIdentifierConfigCollection.getRunnerTokenByInstance(runnerInstance),
            port: messageChanel.port1,
        });
        runnerEnvironmentHost.initSync({ runnerInstance });

        this.runnerEnvironmentHosts.add(runnerEnvironmentHost);
        return messageChanel.port2;
    }

    protected buildRunnerEnvironmentHost(
        config: IRunnerEnvironmentHostConfig
    ): RunnerEnvironmentHost<AvailableRunnersFromList<L>> {
        return new RunnerEnvironmentHost(config);
    }

    protected buildWorkerErrorSerializer(): WorkerRunnerErrorSerializer {
        return WORKER_RUNNER_ERROR_SERIALIZER;
    }

    private async onAllDisconnect(): Promise<void> {
        await this.clearEnvironment();
    }

    private async clearEnvironment(): Promise<void> {
        const possibleErrors = await allPromisesCollectErrors(
            [...this.runnerEnvironmentHosts]
                .map(runnerEnvironmentHost => runnerEnvironmentHost.handleDestroy())
        )
        this.runnerEnvironmentHosts.clear();
        if ('errors' in possibleErrors) {
            throw new HostResolverDestroyError({ 
                originalErrors: possibleErrors.errors,
            });
        }
    }

    private handleNewConnection(port: MessagePort): void {
        this.connectHost.addPort(port);
    }
    
    private async initRunnerInstance(
        action: IClientResolverInitRunnerAction | IClientResolverSoftInitRunnerAction,
    ): Promise<
        | IHostResolverSoftRunnerInitedAction
        | IHostResolverRunnerInitedAction
    > {
        try {
            const messageChanel = new MessageChannel();
            const runnerEnvironmentHost = this.buildRunnerEnvironmentHostByPartConfig({
                token: action.token,
                port: messageChanel.port1,
            });
            await runnerEnvironmentHost.initAsync({ arguments: action.args });
            this.runnerEnvironmentHosts.add(runnerEnvironmentHost);

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
        } catch (error: unknown) {
            throw this.errorSerializer.normalize(error, RunnerInitError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                    token: action.token,
                    runnerName: this.runnerIdentifierConfigCollection
                        .getRunnerConstructorSoft(action.token)?.name,
                }),
            });
        }
    }

    private buildRunnerEnvironmentHostByPartConfig(
        config: Pick<IRunnerEnvironmentHostConfig, 'token' | 'port'>
    ): RunnerEnvironmentHost<AvailableRunnersFromList<L>> {
        const runnerEnvironmentHost = this.buildRunnerEnvironmentHost({
            errorSerializer: this.errorSerializer,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            onDestroyed: () => this.runnerEnvironmentHosts.delete(runnerEnvironmentHost),
            ...config,
        });
        return runnerEnvironmentHost;
    }
}
