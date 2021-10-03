import { serializeArguments } from '../../arguments-serialization/serialize-arguments';
import { ConnectClient } from '../../connect/client/connect.client';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { ConnectionWasClosedError, RunnerInitError } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { IRunnerEnvironmentClientCollectionConfig, RunnerEnvironmentClientCollection } from '../../runner-environment/client/runner-environment.client.collection';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { RunnerBridge } from '../../runner/runner.bridge';
import { IRunnerParameter } from '../../types/constructor';
import { RunnerResolverPossibleConnection } from '../../types/possible-connection';
import { AvailableRunnersFromList, RunnerToken, AvailableRunnerIdentifier, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { IHostResolverRunnerInitedAction, HostResolverAction, IHostResolverSoftRunnerInitedAction } from '../host/host-resolver.actions';
import { ClientResolverBridge } from '../resolver-bridge/client/client-resolver.bridge';
import { LocalResolverBridge } from '../resolver-bridge/local/local-resolver.bridge';
import { IClientResolverInitRunnerAction, ClientResolverAction, IClientResolverSoftInitRunnerAction } from './client-resolver.actions';

export type IClientRunnerResolverConfigBase<L extends RunnerIdentifierConfigList> = {
    connection: RunnerResolverPossibleConnection;
    runners?: L;
}

export class ClientRunnerResolverBase<L extends RunnerIdentifierConfigList>  {

    protected resolverBridge?: ClientResolverBridge;
    protected connectClient?: ConnectClient;

    protected readonly errorSerializer: WorkerRunnerErrorSerializer = this.buildErrorSerializer();
    protected readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<L>;

    private readonly connection: RunnerResolverPossibleConnection;
    private readonly runnerEnvironmentClientCollection: RunnerEnvironmentClientCollection<L>;

    constructor(config: IClientRunnerResolverConfigBase<L>) {
        this.runnerIdentifierConfigCollection = new RunnerIdentifierConfigCollection({
            runners: config.runners || [],
        });
        this.connection = config.connection || self;
        this.runnerEnvironmentClientCollection = this.buildRunnerEnvironmentClientCollection({
            errorSerializer: this.errorSerializer,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
        });
    }

    /** Launches and prepares RunnerResolver for work */
    public async run(): Promise<void> {
        this.buildResolverBridge();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const port = await this.resolverBridge!.connect();
        this.connectClient = new ConnectClient({
            port,
            errorSerializer: this.errorSerializer,
            forceDestroyHandler: this.destroyByForce.bind(this),
        });
    }

    /** Returns a runner control object that will call the methods of the source instance */
    public async resolve(identifier: AvailableRunnerIdentifier<L>, ...args: IRunnerParameter[]): Promise<RunnerBridge> {
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
        const action = await this.sendInitAction(token, args);
        if (action.type === HostResolverAction.SOFT_RUNNER_INITED) {
            this.runnerIdentifierConfigCollection.defineRunnerBridge(token, action.methodsNames);
        }
        const runnerEnvironmentClient = await this.runnerEnvironmentClientCollection
            .initRunnerEnvironmentClientByPartConfigAndAttachToList({
                token,
                port: action.port,
            });
        return runnerEnvironmentClient.resolvedRunner;
    }

    /** Destroying of all resolved Runners instance */
    public async destroy(): Promise<void> {
        if (this.connectClient) {
            await this.connectClient.destroy();
            this.stopListenAndClearAllRunnerEnvironmentClientCollection();
            this.connectClient = undefined;
            this.resolverBridge = undefined;
        } else {
            throw new ConnectionWasClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.HOST_RESOLVER_NOT_INIT(),
            });
        }
    }

    protected buildResolverBridge(): void {
        this.resolverBridge = new ClientResolverBridge({ connection: this.connection });
    }

    protected buildErrorSerializer(): WorkerRunnerErrorSerializer {
        return WORKER_RUNNER_ERROR_SERIALIZER;
    }

    protected buildRunnerEnvironmentClientCollection(
        config: IRunnerEnvironmentClientCollectionConfig<L>
    ): RunnerEnvironmentClientCollection<L> {
        return new RunnerEnvironmentClientCollection(config);
    }

    protected async sendInitAction(
        token: RunnerToken,
        args: IRunnerParameter[],
    ): Promise<IHostResolverRunnerInitedAction | IHostResolverSoftRunnerInitedAction> {
        if (!this.connectClient) {
            throw new ConnectionWasClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.HOST_RESOLVER_NOT_INIT(),
            });
        }
        try {
            const serializedArguments = await serializeArguments({
                arguments: args,
                combinedErrorsFactory: (errors: unknown[]) => new RunnerInitError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                        token,
                        runnerName: this.runnerIdentifierConfigCollection.getRunnerConstructorSoft(token)?.name
                    }),
                    originalErrors: errors,
                }),
            });
            const hasBridgeConstructor = this.runnerIdentifierConfigCollection.hasBridgeConstructor(token);
            const action: IClientResolverInitRunnerAction | IClientResolverSoftInitRunnerAction = {
                type: hasBridgeConstructor ? ClientResolverAction.INIT_RUNNER : ClientResolverAction.SOFT_INIT_RUNNER,
                token: token,
                args: serializedArguments.arguments,
                transfer: serializedArguments.transfer,
            };
            const responseAction: IHostResolverRunnerInitedAction | IHostResolverSoftRunnerInitedAction
                = await this.connectClient.sendAction(action);
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

    protected destroyByForce(): void {
        throw new WorkerRunnerUnexpectedError({
            message: 'Runner Resolver cannot be destroyed by force',
        });
    }

    // TODO Need to implement the configuration token after adding constructing resolver/
    /**
     * Wraps the Runner and returns a Runner control object that will call the methods of the original Runner instance.
     * The original Runner instance will be executed in the same area in which it was wrapped.
     */
    protected wrapRunner(runnerInstance: InstanceType<AvailableRunnersFromList<L>>): RunnerBridge {
        if (!this.resolverBridge) {
            throw new ConnectionWasClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.HOST_RESOLVER_NOT_INIT(),
            });
        }
        const runnerConstructor: AvailableRunnersFromList<L> = Object.getPrototypeOf(runnerInstance).constructor;
        let token = this.runnerIdentifierConfigCollection.getRunnerTokenSoft(runnerConstructor);
        if (!token) {
            token = this.runnerIdentifierConfigCollection.generateTokenNameByRunnerConstructor(runnerConstructor);
            this.runnerIdentifierConfigCollection.defineRunnerConstructor(token, runnerConstructor);
        }
        const runnerBridgeConstructor = this.runnerIdentifierConfigCollection.getRunnerBridgeConstructor(token);
        const port = (this.resolverBridge as LocalResolverBridge<RunnerIdentifierConfigList>)
            .hostRunnerResolver.wrapRunner(runnerInstance);
        const runnerEnvironmentClient = this.runnerEnvironmentClientCollection.buildRunnerEnvironmentClientByPartConfig({
            token,
            port,
        });
        this.runnerEnvironmentClientCollection.add(runnerEnvironmentClient);
        runnerEnvironmentClient.initSync({ runnerBridgeConstructor });

        return runnerEnvironmentClient.resolvedRunner;
    }

    private stopListenAndClearAllRunnerEnvironmentClientCollection(): void {
        for (const runnerEnvironmentClient of this.runnerEnvironmentClientCollection.runnerEnvironmentClients) {
            runnerEnvironmentClient.stopListen();
        }
        this.runnerEnvironmentClientCollection.runnerEnvironmentClients.clear();
    }
}
