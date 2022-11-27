import { ActionController } from '../../action-controller/action-controller';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient, DataForSendRunner } from '../../connection-strategies/base/base.connection-strategy-client';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ConnectionClosedError, RunnerResolverClientDestroyError } from '../../errors/runner-errors';
import { IPlugin } from '../../plugins/plugins.type';
import { PluginsResolver } from '../../plugins/resolver/plugins.resolver';
import { TransferPluginsResolver } from '../../plugins/transfer-plugin/base/transfer-plugins.resolver';
import { ICollectionTransferPluginSendArrayData } from '../../plugins/transfer-plugin/collection-transfer-plugin/collection-transfer-plugin-data';
import { RunnerTransferPlugin } from '../../plugins/transfer-plugin/runner-transfer-plugin/runner-transfer.plugin';
import { RunnerEnvironmentClientCollection } from '../../runner-environment/client/runner-environment.client.collection';
import { ResolvedRunner } from '../../runner/resolved-runner';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { RunnerController } from '../../runner/runner.controller';
import { TransferRunnerArray } from '../../transfer-data/transfer-runner-array';
import { IActionWithId } from '../../types/action';
import { IRunnerParameter, RunnerConstructor } from '../../types/constructor';
import { RunnerIdentifier, RunnerIdentifierConfigList, RunnerToken } from "../../types/runner-identifier";
import { rowPromisesErrors } from '../../utils/row-promises-errors';
import { IRunnerResolverHostAction, IRunnerResolverHostErrorAction, IRunnerResolverHostRunnerInitedAction, IRunnerResolverHostSoftRunnerInitedAction, RunnerResolverHostAction } from '../host/runner-resolver.host.actions';
import { IRunnerResolverClientAction, IRunnerResolverClientDestroyAction, IRunnerResolverClientInitRunnerAction, IRunnerResolverClientSoftInitRunnerAction, RunnerResolverClientAction } from './runner-resolver.client.actions';

export interface IConnectedRunnerResolverClientConfig {
    connectionChannel: BaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyClient,
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    plugins?: IPlugin[],
}

export class ConnectedRunnerResolverClient {
    
    private readonly actionController: ActionController;
    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    private readonly connectionStrategy: BaseConnectionStrategyClient;
    private readonly runnerEnvironmentClientCollection: RunnerEnvironmentClientCollection<RunnerIdentifierConfigList>;
    private readonly pluginsResolver: PluginsResolver;
    private readonly transferPluginsResolver: TransferPluginsResolver;

    constructor(config: IConnectedRunnerResolverClientConfig) {
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
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
        this.transferPluginsResolver = this.pluginsResolver.resolveTransferResolver();
        this.runnerEnvironmentClientCollection = new RunnerEnvironmentClientCollection({
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            connectionStrategy: this.connectionStrategy,
            pluginsResolver: this.pluginsResolver,
        });
        this.transferPluginsResolver.registerRunnerEnvironmentClientPartFactory(
            this.runnerEnvironmentClientCollection.runnerEnvironmentClientPartFactory,
        );
    }

    public run(): void {
        this.actionController.run();
    }

    /** Returns a runner control object that will call the methods of the source instance */
    public async resolve(identifier: RunnerIdentifier, ...args: IRunnerParameter[]): Promise<RunnerController> {
        const token: RunnerToken = this.getTokenByIdentifier(identifier);
        const action = await this.resolveInitAction(token, args);
        if (action.type === RunnerResolverHostAction.SOFT_RUNNER_INITED) {
            this.runnerIdentifierConfigCollection.defineRunnerController(token, action.methodsNames);
        }
        const runnerEnvironmentClient = await this.runnerEnvironmentClientCollection
            .initRunnerEnvironmentClientByPartConfig({
                token,
                connectionChannel: this.connectionStrategy.resolveConnectionForRunner(
                    this.actionController.connectionChannel,
                    action as unknown as DataForSendRunner,
                ),
            });
        return runnerEnvironmentClient.resolvedRunner;
    }

    public wrapRunner(
        runnerInstance: InstanceType<RunnerConstructor>,
        connectionChannel: BaseConnectionChannel
    ): ResolvedRunner<RunnerConstructor> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const runnerConstructor: RunnerConstructor = Object.getPrototypeOf(runnerInstance).constructor;
        let token = this.runnerIdentifierConfigCollection.getRunnerTokenSoft(runnerConstructor);
        if (!token) {
            token = this.runnerIdentifierConfigCollection.generateTokenNameByRunnerConstructor(runnerConstructor);
            this.runnerIdentifierConfigCollection.defineRunnerConstructor(token, runnerConstructor);
        }
        const runnerControllerConstructor = this.runnerIdentifierConfigCollection.getRunnerControllerConstructor(token);
        const runnerEnvironmentClient = this.runnerEnvironmentClientCollection.buildRunnerEnvironmentClientByPartConfig({
            token: token,
            connectionChannel,
        });
        runnerEnvironmentClient.initSync({ runnerControllerConstructor });

        return runnerEnvironmentClient.resolvedRunner;
    }

    /** Destroying of all resolved Runners instance */
    public destroy(): Promise<void> {
        return rowPromisesErrors([
            () => this.resolveActionAndHandleError<IRunnerResolverClientDestroyAction>({
                type: RunnerResolverClientAction.DESTROY,
            }),
            () => this.runnerEnvironmentClientCollection.destroy(),
            () => this.actionController.destroy(),
        ], {
            errorFactory: originalErrors => new RunnerResolverClientDestroyError({originalErrors})
        });
    }

    protected async resolveInitAction(
        token: RunnerToken,
        args: IRunnerParameter[],
    ): Promise<IRunnerResolverHostRunnerInitedAction | IRunnerResolverHostSoftRunnerInitedAction> {
        if (!this.actionController?.connectionChannel.isConnected) {
            throw new ConnectionClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
            });
        }
        const preparedData = await this.transferPluginsResolver.transferData({
            actionController: this.actionController,
            data: new TransferRunnerArray(args),
        });
        if (!this.actionController?.connectionChannel.isConnected) {
            await preparedData.cancel?.();
            throw new ConnectionClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
            });
        }

        const responseAction = await this.resolveActionAndHandleError<
            IRunnerResolverClientInitRunnerAction | IRunnerResolverClientSoftInitRunnerAction,
            IRunnerResolverHostRunnerInitedAction | IRunnerResolverHostSoftRunnerInitedAction
        >({
            type: this.runnerIdentifierConfigCollection.hasControllerConstructor(token)
                ? RunnerResolverClientAction.INIT_RUNNER
                : RunnerResolverClientAction.SOFT_INIT_RUNNER,
            token: token,
            args: preparedData.data as unknown as ICollectionTransferPluginSendArrayData,
        }, preparedData.transfer);

        return responseAction;
    }

    private getTokenByIdentifier(identifier: RunnerIdentifier): RunnerToken {
        let token: RunnerToken;
        if (typeof identifier === 'string') {
            token = identifier;
        } else {
            const softToken = this.runnerIdentifierConfigCollection.getRunnerTokenSoft(identifier);
            if (softToken) {
                token = softToken;
            } else {
                token = this.runnerIdentifierConfigCollection.generateTokenNameByRunnerConstructor(identifier);
                this.runnerIdentifierConfigCollection.defineRunnerConstructor(token, identifier);
            }
        }
        return token;
    }

    private async resolveActionAndHandleError< // TODO Move duplicated code to actionController?
        I extends IRunnerResolverClientAction,
        O extends IRunnerResolverHostAction = IRunnerResolverHostAction,
    >(action: I, transfer?: Transferable[]): Promise<O & IActionWithId> {
        const responseAction = await this.actionController.resolveAction<I, O>(action, transfer);
        if (responseAction.type === RunnerResolverHostAction.ERROR) {
            throw this.pluginsResolver.errorSerialization.deserializeError(
                (responseAction as unknown as IRunnerResolverHostErrorAction).error,
            );
        }
        return responseAction;
    }
}
