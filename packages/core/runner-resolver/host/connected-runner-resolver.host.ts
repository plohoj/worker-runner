import { IPluginHost } from '@worker-runner/core/plugins/plugins.type';
import { RunnerTransferPlugin } from '@worker-runner/core/plugins/transfer-plugin/runner-transfer-plugin/runner-transfer.plugin';
import { ActionController } from '../../action-controller/action-controller';
import { BestStrategyResolverClientActions, IBestStrategyResolverClientConnectAction } from '../../best-strategy-resolver/client/best-strategy-resolver.client.actions';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { RunnerInitError, RunnerResolverHostDestroyError } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { IRunnerEnvironmentHostConfig, RunnerEnvironmentHost } from '../../runner-environment/host/runner-environment.host';
import { RunnerIdentifierConfigCollection } from "../../runner/runner-identifier-config.collection";
import { IActionWithId } from '../../types/action';
import { RunnerConstructor } from '../../types/constructor';
import { RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { collectPromisesErrors } from '../../utils/collect-promises-errors';
import { IRunnerResolverClientAction, IRunnerResolverClientInitRunnerAction, IRunnerResolverClientSoftInitRunnerAction, RunnerResolverClientAction } from '../client/runner-resolver.client.actions';
import { IRunnerResolverHostDestroyedAction, IRunnerResolverHostErrorAction, IRunnerResolverHostRunnerInitedAction, IRunnerResolverHostSoftRunnerInitedAction, RunnerResolverHostAction } from './runner-resolver.host.actions';
import { PluginsResolverHost } from '../../plugins/resolver/plugins.resolver.host';
import { normalizeError } from '../../errors/normalize-error';

export interface IConnectedRunnerResolverHostConfig {
    connectionChannel: BaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyHost,
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    plugins?: IPluginHost[];
    onDestroy: () => void;
}

export class ConnectedRunnerResolverHost {

    public readonly runnerEnvironmentHosts = new Set<RunnerEnvironmentHost<RunnerConstructor>>();

    private readonly actionController: ActionController;
    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection;
    private readonly connectionStrategy: BaseConnectionStrategyHost;
    private readonly pluginsResolver: PluginsResolverHost;
    private onDestroy: () => void;

    constructor(config: IConnectedRunnerResolverHostConfig) {
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.connectionStrategy = config.connectionStrategy;
        this.actionController = new ActionController({connectionChannel: config.connectionChannel});
        const runnerTransferPlugin = new RunnerTransferPlugin({
            connectionStrategy: this.connectionStrategy.strategyClient,
        })
        this.pluginsResolver = new PluginsResolverHost({
            plugins: [
                ...config.plugins || [],
                runnerTransferPlugin,
            ],
        });
        this.onDestroy = config.onDestroy;
    }

    public run(): void {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.actionController.addActionHandler(this.handleAction);
        this.actionController.run();
    }

    public async handleDestroy(actionId?: number): Promise<void> {
        try {
            await this.clearEnvironments();
        } finally {
            const destroyedAction: IRunnerResolverHostDestroyedAction = {
                type: RunnerResolverHostAction.DESTROYED,
            }
            if (actionId === undefined) {
                this.actionController.sendAction<IRunnerResolverHostDestroyedAction>(destroyedAction);
            } else {
                this.actionController.sendActionResponse<IRunnerResolverHostDestroyedAction>({
                    ...destroyedAction,
                    id: actionId,
                });
            }
            this.actionController.destroy();
            this.onDestroy();
        }
    }

    public wrapRunner(
        runnerInstance: InstanceType<RunnerConstructor>,
        connectionChannel: BaseConnectionChannel,
    ): void {
        const runnerEnvironmentHost = this.buildRunnerEnvironmentHostByPartConfig({
            token: this.runnerIdentifierConfigCollection.getRunnerTokenByInstance(runnerInstance),
        });
        runnerEnvironmentHost.initSync({ runnerInstance, connectionChannel });

        this.runnerEnvironmentHosts.add(runnerEnvironmentHost);
    }

    protected buildRunnerEnvironmentHost(
        config: IRunnerEnvironmentHostConfig
    ): RunnerEnvironmentHost<RunnerConstructor> {
        return new RunnerEnvironmentHost(config);
    }
    
    private buildRunnerEnvironmentHostByPartConfig(
        config: Pick<IRunnerEnvironmentHostConfig, 'token'>
    ): RunnerEnvironmentHost<RunnerConstructor> {
        const runnerEnvironmentHost = this.buildRunnerEnvironmentHost({
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            connectionStrategy: this.connectionStrategy,
            pluginsResolver: this.pluginsResolver,
            onDestroyed: () => this.runnerEnvironmentHosts.delete(runnerEnvironmentHost),
            ...config,
        });
        return runnerEnvironmentHost;
    }

    private handleAction = async (
        action: IRunnerResolverClientAction & IActionWithId | IBestStrategyResolverClientConnectAction,
    ): Promise<void> => {
        try {
            switch (action.type) {
                case RunnerResolverClientAction.INIT_RUNNER:
                case RunnerResolverClientAction.SOFT_INIT_RUNNER:
                    await this.initRunnerInstance(action);
                    break;
                case RunnerResolverClientAction.DESTROY:
                    await this.handleDestroy(action.id)
                    break;
                // Ignore side effects of connection establishment
                case BestStrategyResolverClientActions.CONNECT:
                    return;
                default:
                    throw new WorkerRunnerUnexpectedError({
                        message: 'Unexpected Action type for Host Runner Resolver',
                    });
            }
        } catch (error) {
            if ('id' in action) {
                const serializedError = this.pluginsResolver.serializeError(
                    normalizeError(error, WorkerRunnerUnexpectedError),
                );
                this.actionController.sendActionResponse<IRunnerResolverHostErrorAction>({
                    type: RunnerResolverHostAction.ERROR,
                    id: action.id as unknown as number,
                    error: serializedError,
                });
            } else {
                throw error;
            }
        }
    }

    private async clearEnvironments(): Promise<void> {
        try {
            await collectPromisesErrors({
                values: this.runnerEnvironmentHosts,
                stopAtFirstError: false,
                mapper: runnerEnvironmentHost => runnerEnvironmentHost.handleDestroy(),
                errorFactory: originalErrors => new RunnerResolverHostDestroyError({originalErrors})
            });
        } finally {
            this.runnerEnvironmentHosts.clear();
        }
    }

    private async initRunnerInstance(
        action: (IRunnerResolverClientInitRunnerAction | IRunnerResolverClientSoftInitRunnerAction) & IActionWithId,
    ): Promise<void> {
        try {
            const responseAction: (IRunnerResolverHostSoftRunnerInitedAction | IRunnerResolverHostRunnerInitedAction) & IActionWithId
                = action.type === RunnerResolverClientAction.SOFT_INIT_RUNNER
                    ? {
                        type: RunnerResolverHostAction.SOFT_RUNNER_INITED,
                        id: action.id,
                        methodsNames: this.runnerIdentifierConfigCollection.getRunnerMethodsNames(action.token),
                    }
                    : {
                        type: RunnerResolverHostAction.RUNNER_INITED,
                        id: action.id,
                    };
            const preparedData = this.connectionStrategy
                .prepareRunnerForSend(this.actionController.connectionChannel);
            Object.assign(responseAction, preparedData.data);
            const runnerEnvironmentHost = this.buildRunnerEnvironmentHostByPartConfig({
                token: action.token,
            });
            try {
                await runnerEnvironmentHost.initAsync({
                    arguments: action.args,
                    connectionChannel: preparedData.connectionChannel,
                });
            } catch (error) {
                runnerEnvironmentHost.cancel();
                throw error;
            }
            // TODO can be added after destroy action from RunnerResolverClient
            this.runnerEnvironmentHosts.add(runnerEnvironmentHost);
            this.actionController.sendActionResponse(responseAction, preparedData.transfer);
        } catch (error: unknown) {
            throw normalizeError(error, RunnerInitError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                    token: action.token,
                    runnerName: this.runnerIdentifierConfigCollection
                        .getRunnerConstructorSoft(action.token)?.name,
                }),
            });
        }
    }
}
