import { ActionController } from '../../action-controller/action-controller';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient, DataForSendRunner } from '../../connection-strategies/base/base.connection-strategy-client';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ConnectionClosedError, RunnerResolverClientDestroyError } from '../../errors/runner-errors';
import { IPlugin } from '../../plugins/plugins';
import { PluginsResolver } from '../../plugins/plugins.resolver';
import { TransferPluginSendData } from '../../plugins/transfer-plugin/base/transfer-plugin-data';
import { ICollectionTransferPluginSendArrayData } from '../../plugins/transfer-plugin/collection-transfer-plugin/collection-transfer-plugin-data';
import { RunnerTransferPlugin } from '../../plugins/transfer-plugin/runner-transfer-plugin/runner-transfer.plugin';
import { RunnerEnvironmentClient, RunnerEnvironmentClientFactory } from '../../runner-environment/client/runner-environment.client';
import { RunnerEnvironmentClientCollection } from '../../runner-environment/client/runner-environment.client.collection';
import { ResolvedRunner } from '../../runner/resolved-runner';
import { RunnerDefinitionCollection } from '../../runner/runner-definition.collection';
import { IRunnerDescription } from '../../runner/runner-description';
import { RunnerController } from '../../runner/runner.controller';
import { TransferRunnerArray } from '../../transfer-data/transfer-runner-array';
import { IActionWithId } from '../../types/action';
import { IRunnerParameter, RunnerConstructor } from '../../types/constructor';
import { RunnerIdentifier, RunnerIdentifierConfigList, RunnerToken } from "../../types/runner-identifier";
import { rowPromisesErrors } from '../../utils/row-promises-errors';
import { IRunnerResolverHostAction, IRunnerResolverHostRunnerInitedAction, IRunnerResolverHostSoftRunnerInitedAction, RunnerResolverHostAction } from '../host/runner-resolver.host.actions';
import { IRunnerResolverClientAction, IRunnerResolverClientDestroyAction, IRunnerResolverClientInitRunnerAction, IRunnerResolverClientSoftInitRunnerAction, RunnerResolverClientAction } from './runner-resolver.client.actions';

export interface IConnectedRunnerResolverClientConfig {
    connectionChannel: BaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyClient,
    runnerDefinitionCollection: RunnerDefinitionCollection<RunnerIdentifierConfigList>;
    plugins?: IPlugin[],
}

export class ConnectedRunnerResolverClient {
    
    private readonly actionController: ActionController;
    private readonly runnerDefinitionCollection: RunnerDefinitionCollection<RunnerIdentifierConfigList>;
    private readonly connectionStrategy: BaseConnectionStrategyClient;
    private readonly environmentCollection: RunnerEnvironmentClientCollection = new RunnerEnvironmentClientCollection();
    private readonly pluginsResolver: PluginsResolver;
    private readonly environmentFactory: RunnerEnvironmentClientFactory;

    constructor(config: IConnectedRunnerResolverClientConfig) {
        this.runnerDefinitionCollection = config.runnerDefinitionCollection;
        this.connectionStrategy = config.connectionStrategy;
        this.actionController = new ActionController({connectionChannel: config.connectionChannel});
        const runnerTransferPlugin = new RunnerTransferPlugin({
            connectionStrategy: this.connectionStrategy,
        })
        this.pluginsResolver = new PluginsResolver({
            plugins: [
                ...config.plugins || [],
                runnerTransferPlugin,
            ],
        });
        this.environmentFactory = RunnerEnvironmentClient.buildFactory({
            connectionStrategy: this.connectionStrategy,
            pluginsResolver: this.pluginsResolver,
            runnerDefinitionCollection: this.runnerDefinitionCollection,
        });
    }

    public run(): void {
        this.actionController.run();
    }

    /** Returns a runner control object that will call the methods of the source instance */
    public async resolve(identifier: RunnerIdentifier, ...args: IRunnerParameter[]): Promise<RunnerController> {
        const token: RunnerToken = this.getTokenByIdentifier(identifier);
        if (!this.actionController?.connectionChannel.isConnected) {
            throw new ConnectionClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
            });
        }
        const runnerDescription: IRunnerDescription = {
            token,
            runnerName: this.runnerDefinitionCollection.getRunnerConstructorSoft(token)?.name,
        };
        const transferPluginsResolver = this.pluginsResolver.resolveTransferResolver({
            runnerEnvironmentClientFactory: this.environmentFactory,
            runnerDescription,
        });
        const preparedData = await transferPluginsResolver.transferData({
            actionController: this.actionController,
            data: new TransferRunnerArray(args),
        });
        if (!this.actionController?.connectionChannel.isConnected) {
            await preparedData.cancel?.();
            await transferPluginsResolver.destroy();
            throw new ConnectionClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
            });
        }

        type IInitAction = IRunnerResolverHostRunnerInitedAction | IRunnerResolverHostSoftRunnerInitedAction;
        const responseAction = await this.resolveActionAndHandleError<
            IRunnerResolverClientInitRunnerAction | IRunnerResolverClientSoftInitRunnerAction,
            IInitAction
        >({
            type: this.runnerDefinitionCollection.hasControllerConstructor(token)
                ? RunnerResolverClientAction.INIT_RUNNER
                : RunnerResolverClientAction.SOFT_INIT_RUNNER,
            token: token,
            args: preparedData.data satisfies TransferPluginSendData as unknown as ICollectionTransferPluginSendArrayData,
        }, preparedData.transfer);

        if (responseAction.type === RunnerResolverHostAction.SOFT_RUNNER_INITED) {
            this.runnerDefinitionCollection.defineRunnerController(token, responseAction.methodsNames);
        }
        const connectionChannel = this.connectionStrategy.resolveConnectionForRunner(
            this.actionController.connectionChannel,
            responseAction satisfies IInitAction as unknown as DataForSendRunner,
        )
        const environmentClient: RunnerEnvironmentClient = await this.environmentFactory({
            token,
            connectionChannel,
            transferPluginsResolver,
            onDestroyed: () => {
                try {
                    this.environmentCollection.remove(environmentClient)
                } catch {
                    // Between successful initialization and waiting for the promise queue, destruction may be called.
                    // Therefore, a ReferenceError is thrown.
                }
            },
        });

        // While waiting for the turn of promises Runner could be destroyed.
        // Before adding a runner to the collection,
        // we check the fact that the runner was not destroyed.
        // If the check fails, a connection error will be thrown.
        if (!connectionChannel.isConnected) {
            throw new ConnectionClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED(runnerDescription),
            });
        }
        this.environmentCollection.add(environmentClient);

        return environmentClient.resolvedRunner;
    }

    public wrapRunner(
        runnerInstance: InstanceType<RunnerConstructor>,
        connectionChannel: BaseConnectionChannel
    ): ResolvedRunner<RunnerConstructor> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const runnerConstructor: RunnerConstructor = Object.getPrototypeOf(runnerInstance).constructor;
        let token = this.runnerDefinitionCollection.getRunnerTokenSoft(runnerConstructor);
        if (!token) {
            token = RunnerDefinitionCollection.generateTokenForRunnerConstructor(runnerConstructor);
            this.runnerDefinitionCollection.defineRunnerConstructor(token, runnerConstructor);
        }
        const runnerControllerConstructor = this.runnerDefinitionCollection.getRunnerControllerConstructor(token);
        const environmentClient: RunnerEnvironmentClient = RunnerEnvironmentClient.initSync({
            token: token,
            connectionChannel,
            connectionStrategy: this.connectionStrategy,
            pluginsResolver: this.pluginsResolver,
            runnerDefinitionCollection: this.runnerDefinitionCollection,
            onDestroyed: () => this.environmentCollection.remove(environmentClient),
            runnerControllerConstructor,
        });
        this.environmentCollection.add(environmentClient);

        return environmentClient.resolvedRunner;
    }

    /** Destroying of all resolved Runners instance */
    public destroy(): Promise<void> {
        return rowPromisesErrors([
            () => this.resolveActionAndHandleError<IRunnerResolverClientDestroyAction>({
                type: RunnerResolverClientAction.DESTROY,
            }),
            () => this.environmentCollection.destroy(),
            () => this.actionController.destroy(),
        ], {
            errorFactory: originalErrors => new RunnerResolverClientDestroyError({originalErrors})
        });
    }

    private getTokenByIdentifier(identifier: RunnerIdentifier): RunnerToken {
        if (typeof identifier === 'string') {
            return identifier;
        }
        const softToken = this.runnerDefinitionCollection.getRunnerTokenSoft(identifier);
        if (softToken) {
            return softToken;
        }
        const token = RunnerDefinitionCollection.generateTokenForRunnerConstructor(identifier);
        this.runnerDefinitionCollection.defineRunnerConstructor(token, identifier);
        return token;
    }

    private async resolveActionAndHandleError< // TODO Move duplicated code to actionController?
        I extends IRunnerResolverClientAction,
        O extends IRunnerResolverHostAction = IRunnerResolverHostAction,
    >(action: I, transfer?: Transferable[]): Promise<O & IActionWithId> {
        const responseAction = await this.actionController.resolveAction<I, O>(action, transfer);
        if (responseAction.type === RunnerResolverHostAction.ERROR) {
            throw this.pluginsResolver.errorSerialization.deserializeError(responseAction.error);
        }
        return responseAction;
    }
}
