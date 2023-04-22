import { ActionController } from '../../action-controller/action-controller';
import { BestStrategyResolverClientActions, IBestStrategyResolverClientPingAction } from '../../best-strategy-resolver/client/best-strategy-resolver.client.actions';
import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { normalizeError } from '../../errors/normalize-error';
import { RunnerInitError, RunnerResolverHostDestroyError } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { IPlugin } from '../../plugins/plugins';
import { PluginsResolver } from '../../plugins/plugins.resolver';
import { RunnerTransferPlugin } from '../../plugins/transfer-plugin/runner-transfer-plugin/runner-transfer.plugin';
import { RunnerDefinitionCollection } from "../../runner/runner-definition.collection";
import { RunnerEnvironmentHost } from '../../runner-environment/host/runner-environment.host';
import { IActionWithId } from '../../types/action';
import { RunnerConstructor } from '../../types/constructor';
import { RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { ErrorCollector } from '../../utils/error-collector';
import { EventHandlerController } from '../../utils/event-handler-controller';
import { WorkerRunnerIdentifier } from '../../utils/identifier-generator';
import { parallelPromises } from '../../utils/parallel-promises';
import { ParallelQueueController } from '../../utils/parallel-queue-controller';
import { IRunnerResolverClientAction, IRunnerResolverClientInitRunnerAction, IRunnerResolverClientSoftInitRunnerAction, RunnerResolverClientAction } from '../client/runner-resolver.client.actions';
import { IRunnerResolverHostDestroyedAction, IRunnerResolverHostErrorAction, IRunnerResolverHostRunnerInitedAction, IRunnerResolverHostSoftRunnerInitedAction, RunnerResolverHostAction } from './runner-resolver.host.actions';

export interface IConnectedRunnerResolverHostConfig {
    connectionChannel: IBaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyHost,
    runnerDefinitionCollection: RunnerDefinitionCollection<RunnerIdentifierConfigList>;
    plugins?: IPlugin[];
}

export class ConnectedRunnerResolverHost {

    public readonly runnerEnvironmentHosts = new Set<RunnerEnvironmentHost>();
    public readonly destroyHandlerController = new EventHandlerController<void>();

    private readonly actionController: ActionController;
    private readonly runnerDefinitionCollection: RunnerDefinitionCollection;
    private readonly connectionStrategy: BaseConnectionStrategyHost;
    private readonly pluginsResolver: PluginsResolver;
    private readonly initializationQueueController = new ParallelQueueController<RunnerEnvironmentHost | void>();

    constructor(config: IConnectedRunnerResolverHostConfig) {
        this.runnerDefinitionCollection = config.runnerDefinitionCollection;
        this.connectionStrategy = config.connectionStrategy;
        this.actionController = new ActionController({connectionChannel: config.connectionChannel});
        const runnerTransferPlugin = new RunnerTransferPlugin({
            connectionStrategy: this.connectionStrategy.strategyClient,
        })
        this.pluginsResolver = new PluginsResolver({
            plugins: [
                ...config.plugins || [],
                runnerTransferPlugin,
            ],
        });
    }

    public run(): void {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.actionController.actionHandlerController.addHandler(this.handleAction);
        this.actionController.run();
    }

    public async handleDestroy(actionId?: WorkerRunnerIdentifier): Promise<void> {
        // TODO Possible attempt to initialize a new Runner during destroying the connection.
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
            this.destroyHandlerController.dispatch();
            this.destroyHandlerController.clear();
        }
    }

    public wrapRunner(
        runnerInstance: InstanceType<RunnerConstructor>,
        connectionChannel: IBaseConnectionChannel,
    ): void {
        const runnerEnvironmentHost = RunnerEnvironmentHost.initSync({
            token: this.runnerDefinitionCollection.getRunnerTokenByInstance(runnerInstance),
            runnerInstance,
            connectionChannel,
            runnerDefinitionCollection: this.runnerDefinitionCollection,
            connectionStrategy: this.connectionStrategy,
            pluginsResolver: this.pluginsResolver,
        });
        runnerEnvironmentHost.destroyHandlerController.addHandler(
            () => this.runnerEnvironmentHosts.delete(runnerEnvironmentHost)
        );
        this.runnerEnvironmentHosts.add(runnerEnvironmentHost);
    }

    private handleAction = async (
        action: IRunnerResolverClientAction & IActionWithId | IBestStrategyResolverClientPingAction,
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
                case BestStrategyResolverClientActions.Ping:
                    return;
                default:
                    throw new WorkerRunnerUnexpectedError({
                        message: 'Unexpected Action type for Host Runner Resolver',
                    });
            }
        } catch (error) {
            if ('id' in action) {
                const serializedError = this.pluginsResolver.errorSerialization.serializeError(
                    normalizeError(error, WorkerRunnerUnexpectedError),
                );
                this.actionController.sendActionResponse<IRunnerResolverHostErrorAction>({
                    type: RunnerResolverHostAction.ERROR,
                    id: action.id,
                    error: serializedError,
                });
            } else {
                throw error;
            }
        }
    }

    private async clearEnvironments(): Promise<void> {
        try {
            const errorCollector = new ErrorCollector(
                originalErrors => new RunnerResolverHostDestroyError({ originalErrors })
            );
            await parallelPromises({
                values: [
                    () => parallelPromises({
                        values: this.runnerEnvironmentHosts,
                        stopAtFirstError: false,
                        mapper: runnerEnvironmentHost => runnerEnvironmentHost.handleDestroy(),
                        errorCollector,
                    }),
                    () => parallelPromises({
                        values: this.initializationQueueController.iterateUntilEmpty(),
                        stopAtFirstError: false,
                        mapper: runnerEnvironmentHost => runnerEnvironmentHost?.handleDestroy(),
                        errorCollector,
                    }),
                ],
                mapper: destroy => destroy(),
                stopAtFirstError: false,
                errorCollector,
            });
        } finally {
            this.runnerEnvironmentHosts.clear();
        }
    }

    /**
     * Asynchronous initialization of a Runner instance.
     * During initialization, a destroy process may be started.
     * But the destroy process will wait for the end of initialization using {@link initializationQueueController}
     */
    private async initRunnerInstance(
        action: (IRunnerResolverClientInitRunnerAction | IRunnerResolverClientSoftInitRunnerAction) & IActionWithId,
    ): Promise<void> {
        const completeFunction = this.initializationQueueController.reserve();
        let runnerEnvironmentHost: RunnerEnvironmentHost | undefined;
        try {
            const responseAction: (IRunnerResolverHostSoftRunnerInitedAction | IRunnerResolverHostRunnerInitedAction) & IActionWithId
                = action.type === RunnerResolverClientAction.SOFT_INIT_RUNNER
                    ? {
                        type: RunnerResolverHostAction.SOFT_RUNNER_INITED,
                        id: action.id,
                        methodsNames: this.runnerDefinitionCollection.getRunnerMethodsNames(action.token),
                    }
                    : {
                        type: RunnerResolverHostAction.RUNNER_INITED,
                        id: action.id,
                    };
            const preparedData = this.connectionStrategy
                .prepareRunnerForSend(this.actionController.connectionChannel);
            Object.assign(responseAction, preparedData.data);
            runnerEnvironmentHost = await RunnerEnvironmentHost.initAsync({
                token: action.token,
                arguments: action.args,
                connectionChannel: preparedData.connectionChannel,
                runnerDefinitionCollection: this.runnerDefinitionCollection,
                connectionStrategy: this.connectionStrategy,
                pluginsResolver: this.pluginsResolver,
            });
            runnerEnvironmentHost.destroyHandlerController.addHandler(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                () => this.runnerEnvironmentHosts.delete(runnerEnvironmentHost!)
            );
            this.runnerEnvironmentHosts.add(runnerEnvironmentHost);
            this.actionController.sendActionResponse(responseAction, preparedData.transfer);
        } catch (error: unknown) {
            throw normalizeError(error, RunnerInitError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                    token: action.token,
                    runnerName: this.runnerDefinitionCollection
                        .getRunnerConstructorSoft(action.token)?.name,
                }),
            });
        } finally {
            completeFunction(runnerEnvironmentHost);
        }
    }
}
