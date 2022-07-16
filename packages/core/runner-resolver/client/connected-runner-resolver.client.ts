import { ActionController } from '../../action-controller/action-controller';
import { ArgumentsSerializer } from '../../arguments-serialization/arguments-serializer';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../../connection-strategies/base/base.connection-strategy-client';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ErrorSerializer } from '../../errors/error.serializer';
import { ConnectionClosedError, RunnerInitError, RunnerResolverClientDestroyError } from '../../errors/runner-errors';
import { IRunnerEnvironmentClientCollectionConfig, RunnerEnvironmentClientCollection } from '../../runner-environment/client/runner-environment.client.collection';
import { ResolvedRunner } from '../../runner/resolved-runner';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { RunnerController } from '../../runner/runner.controller';
import { IActionWithId } from '../../types/action';
import { IRunnerParameter, RunnerConstructor } from '../../types/constructor';
import { RunnerIdentifier, RunnerIdentifierConfigList, RunnerToken } from "../../types/runner-identifier";
import { allPromisesCollectErrors } from '../../utils/all-promises-collect-errors';
import { IRunnerResolverHostAction, IRunnerResolverHostErrorAction, IRunnerResolverHostRunnerInitedAction, IRunnerResolverHostSoftRunnerInitedAction, RunnerResolverHostAction } from '../host/runner-resolver.host.actions';
import { IRunnerResolverClientAction, IRunnerResolverClientDestroyAction, IRunnerResolverClientInitRunnerAction, IRunnerResolverClientSoftInitRunnerAction, RunnerResolverClientAction } from './runner-resolver.client.actions';

export interface IConnectedRunnerResolverClientConfig {
    connectionChannel: BaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyClient,
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    errorSerializer: ErrorSerializer,
    argumentSerializer: ArgumentsSerializer;
}

export class ConnectedRunnerResolverClient {
    
    private readonly actionController: ActionController;
    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    private readonly connectionStrategy: BaseConnectionStrategyClient;
    private readonly errorSerializer: ErrorSerializer;
    private readonly argumentSerializer: ArgumentsSerializer;
    private readonly runnerEnvironmentClientCollection: RunnerEnvironmentClientCollection<RunnerIdentifierConfigList>;

    constructor(config: IConnectedRunnerResolverClientConfig) {
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.connectionStrategy = config.connectionStrategy;
        this.errorSerializer = config.errorSerializer;
        this.argumentSerializer = config.argumentSerializer;
        this.actionController = new ActionController({connectionChannel: config.connectionChannel});
        this.runnerEnvironmentClientCollection = this.buildRunnerEnvironmentClientCollection({
            errorSerializer: this.errorSerializer,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            connectionStrategy: this.connectionStrategy,
            argumentSerializer: this.argumentSerializer,
        });
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
                    action,
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
    public async destroy(): Promise<void> {
        const errors = new Array<unknown>(); 
        try {
            await this.resolveActionAndHandleError<IRunnerResolverClientDestroyAction>({
                type: RunnerResolverClientAction.DESTROY,
            });
        } catch (error) {
            errors.push(error);
        }
        const possibleErrors = await allPromisesCollectErrors(
            [...this.runnerEnvironmentClientCollection.runnerEnvironmentClients]
                .map(runnerEnvironment => runnerEnvironment.destroy())
        )
        this.runnerEnvironmentClientCollection.runnerEnvironmentClients.clear();
        this.actionController.destroy();
        if ('errors' in possibleErrors) {
            errors.push(...possibleErrors.errors);
        }
        if (errors.length > 0) {
            throw new RunnerResolverClientDestroyError({ 
                originalErrors: errors,
            });
        }
    }

    protected buildRunnerEnvironmentClientCollection(
        config: IRunnerEnvironmentClientCollectionConfig<RunnerIdentifierConfigList>
    ): RunnerEnvironmentClientCollection<RunnerIdentifierConfigList> {
        return new RunnerEnvironmentClientCollection(config);
    }

    protected async resolveInitAction(
        token: RunnerToken,
        args: IRunnerParameter[],
    ): Promise<IRunnerResolverHostRunnerInitedAction | IRunnerResolverHostSoftRunnerInitedAction> {
        if (!this.actionController) {
            throw new ConnectionClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(),
            });
        }
        try {
            const serializedArguments = await this.argumentSerializer.serializeArguments({
                arguments: args,
                currentChannel: this.actionController.connectionChannel,
                combinedErrorsFactory: (errors: unknown[]) => new RunnerInitError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                        token,
                        runnerName: this.runnerIdentifierConfigCollection.getRunnerConstructorSoft(token)?.name
                    }),
                    originalErrors: errors,
                }),
            });
            const responseAction = await this.resolveActionAndHandleError<
                    IRunnerResolverClientInitRunnerAction | IRunnerResolverClientSoftInitRunnerAction,
                    IRunnerResolverHostRunnerInitedAction | IRunnerResolverHostSoftRunnerInitedAction
                >({
                    type: this.runnerIdentifierConfigCollection.hasControllerConstructor(token)
                        ? RunnerResolverClientAction.INIT_RUNNER
                        : RunnerResolverClientAction.SOFT_INIT_RUNNER,
                    token: token,
                    args: serializedArguments.arguments,
                }, serializedArguments.transfer);
            return responseAction;
        } catch (error) {
            throw this.errorSerializer.normalize(error, RunnerInitError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                    token,
                    runnerName: this.runnerIdentifierConfigCollection.getRunnerConstructorSoft(token)?.name,
                }),
            });
        }
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
            throw this.errorSerializer.deserialize(
                (responseAction as unknown as IRunnerResolverHostErrorAction).error,
            );
        }
        return responseAction;
    }
}
