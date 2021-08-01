import { IConnectControllerErrorDeserializer } from '../../connect/controller/connect-controller-error-deserializer';
import { ConnectController } from '../../connect/controller/connect.controller';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { ConnectionWasClosedError } from '../../errors/runner-errors';
import { WorkerRunnerError, WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { RunnerControllerPartFactory, IRunnerControllerConfig, RunnerController } from '../../runner/controller/runner.controller';
import { IRunnerBridgeConstructor, RunnerBridge } from '../../runner/runner-bridge/runner.bridge';
import { RunnersListController } from '../../runner/runner-bridge/runners-list.controller';
import { IRunnerParameter } from '../../types/constructor';
import { RunnerResolverPossibleConnection } from '../../types/possible-connection';
import { AvailableRunnersFromList, RunnerToken, AvailableRunnerIdentifier, SoftRunnersList, AnyRunnerFromList, StrictRunnersList } from "../../types/runner-identifier";
import { IHostResolverRunnerInitedAction, IHostResolverRunnerInitErrorAction, HostResolverAction, IHostResolverSoftRunnerInitedAction } from '../host/host-resolver.actions';
import { ClientResolverBridge } from '../resolver-bridge/client/client-resolver.bridge';
import { LocalResolverBridge } from '../resolver-bridge/local/local-resolver.bridge';
import { serializeArguments } from './arguments-serialize';
import { IClientResolverInitRunnerAction, ClientResolverAction, IClientResolverSoftInitRunnerAction } from './client-resolver.actions';


export type IClientRunnerResolverConfigBase<L extends SoftRunnersList> = {
    connection: RunnerResolverPossibleConnection;
    runners?: L;
}

export class ClientRunnerResolverBase<L extends SoftRunnersList>  {

    protected runnerControllers = new Set<RunnerController<AnyRunnerFromList<L>>>();
    protected resolverBridge?: ClientResolverBridge;
    protected connectController?: ConnectController;

    protected readonly errorSerializer: WorkerRunnerErrorSerializer = this.buildErrorSerializer();
    protected readonly runnersListController: RunnersListController<L>;

    private readonly connection: RunnerResolverPossibleConnection;
    private readonly runnerControllerPartFactory: RunnerControllerPartFactory<AnyRunnerFromList<L>>
        = this.buildRunnerControllerByPartConfig.bind(this);

    constructor(config: IClientRunnerResolverConfigBase<L>) {
        this.runnersListController = new RunnersListController({
            runners: config.runners || [],
        });
        this.connection = config.connection || self;
    }

    /** Launches and prepares RunnerResolver for work */
    public async run(): Promise<void> {
        this.buildResolverBridge();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const port = await this.resolverBridge!.connect();
        this.connectController = new ConnectController({
            port,
            destroyErrorDeserializer: this.errorSerializer
                .deserialize.bind(this.errorSerializer) as IConnectControllerErrorDeserializer,
            forceDestroyHandler: this.destroyByForce.bind(this),
        });
    }

    /** Returns a runner control object that will call the methods of the source instance */
    public async resolve(identifier: AvailableRunnerIdentifier<L>, ...args: IRunnerParameter[]): Promise<RunnerBridge> {
        let token: RunnerToken;
        if (typeof identifier === 'string') {
            token = identifier;
        } else {
            const softToken = this.runnersListController.getRunnerTokenSoft(identifier);
            if (softToken) {
                token = softToken;
            } else {
                token = this.runnersListController.generateTokenNameByRunnerConstructor(identifier);
                this.runnersListController.defineRunnerConstructor(token, identifier);
            }
        }
        const action = await this.sendInitAction(token, args);
        if (action.type === HostResolverAction.SOFT_RUNNER_INITED) {
            this.runnersListController.defineRunnerBridge(token, action.methodsNames);
        }
        const runnerController: RunnerController<AnyRunnerFromList<L>> = await this.buildRunnerControllerByPartConfig({
            token,
            port: action.port,
        });
        return runnerController.resolvedRunner;
    }

    /** Destroying of all resolved Runners instance */
    public async destroy(): Promise<void> {
        if (this.connectController) {
            await this.connectController.destroy();
            this.destroyRunnerControllers();
            this.connectController = undefined;
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

    protected async buildRunnerControllerByPartConfig(config: {
        token: RunnerToken,
        port: MessagePort,
    }): Promise<RunnerController<AnyRunnerFromList<L>>> {
        const runnerController: RunnerController<AnyRunnerFromList<L>> = await this.buildRunnerControllerAndAttachToList({
            ...config,
            runnersListController: this.runnersListController,
            runnerControllerPartFactory: this.runnerControllerPartFactory,
            errorSerializer: this.errorSerializer,
        });
        return runnerController;
    }

    protected buildRunnerControllerWithoutInit(
        config: IRunnerControllerConfig<AnyRunnerFromList<L>>
    ): RunnerController<AnyRunnerFromList<L>> {
        return new RunnerController(config);
    }

    protected buildErrorSerializer(): WorkerRunnerErrorSerializer {
        return WORKER_RUNNER_ERROR_SERIALIZER;
    }

    protected async sendInitAction(
        token: RunnerToken,
        args: IRunnerParameter[],
    ): Promise<IHostResolverRunnerInitedAction | IHostResolverSoftRunnerInitedAction> {
        if (!this.connectController) {
            throw new ConnectionWasClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.HOST_RESOLVER_NOT_INIT(),
            });
        }
        try {
            const serializedArguments = await serializeArguments(args);
            const hasBridgeConstructor = this.runnersListController.hasBridgeConstructor(token);
            const action: IClientResolverInitRunnerAction | IClientResolverSoftInitRunnerAction = {
                type: hasBridgeConstructor ? ClientResolverAction.INIT_RUNNER : ClientResolverAction.SOFT_INIT_RUNNER,
                token: token,
                args: serializedArguments.args,
                transfer: serializedArguments.transfer,
            };
            const responseAction:
                | IHostResolverRunnerInitedAction
                | IHostResolverSoftRunnerInitedAction
                | IHostResolverRunnerInitErrorAction
                    = await this.connectController.sendAction(action);
            if (responseAction.type === HostResolverAction.RUNNER_INIT_ERROR) {
                throw this.errorSerializer.deserialize(responseAction);
            }
            return responseAction;
        } catch (error) {
            if (error instanceof WorkerRunnerError) {
                throw error;
            }
            throw new WorkerRunnerUnexpectedError(this.errorSerializer.serialize(error, {
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                    token,
                    runnerName: this.runnersListController.getRunnerConstructorSoft(token)?.name,
                }),
            }));
        }
    }

    protected destroyRunnerControllers(): void {
        for (const runnerController of this.runnerControllers) {
            runnerController.stopListen();
        }
        this.runnerControllers.clear();
    }

    protected destroyByForce(): void {
        throw new WorkerRunnerUnexpectedError({
            message: 'Runner Resolver cannot be destroyed by force',
        });
    }

    /**
     * Wraps the Runner and returns a Runner control object that will call the methods of the original Runner instance.
     * The original Runner instance will be executed in the same area in which it was wrapped.
     */
    // TODO try to transfer the method to mixin
    protected wrapRunner(runnerInstance: InstanceType<AvailableRunnersFromList<L>>): RunnerBridge {
        if (!this.resolverBridge) {
            throw new ConnectionWasClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.HOST_RESOLVER_NOT_INIT(),
            });
        }
        const runnerConstructor: AvailableRunnersFromList<L> = Object.getPrototypeOf(runnerInstance).constructor;
        let token = this.runnersListController.getRunnerTokenSoft(runnerConstructor);
        if (!token) {
            token = this.runnersListController.generateTokenNameByRunnerConstructor(runnerConstructor);
            this.runnersListController.defineRunnerConstructor(token, runnerConstructor);
        }
        const runnerBridgeConstructor = this.runnersListController.getRunnerBridgeConstructor(token);
        const port = (this.resolverBridge as LocalResolverBridge<StrictRunnersList>).hostRunnerResolver.wrapRunner(runnerInstance);
        const runnerController = this.buildRunnerControllerAndAttachToList({
            token,
            port,
            runnersListController: this.runnersListController,
            runnerControllerPartFactory: this.runnerControllerPartFactory,
            errorSerializer: this.errorSerializer,
        }, runnerBridgeConstructor);
        return runnerController.resolvedRunner;
    }

     
    private buildRunnerControllerAndAttachToList(
        config: Omit<IRunnerControllerConfig<AnyRunnerFromList<L>>, 'onDestroyed'>,
        runnerBridgeConstructor: IRunnerBridgeConstructor
    ): RunnerController<AnyRunnerFromList<L>>;
    private buildRunnerControllerAndAttachToList(
        config: Omit<IRunnerControllerConfig<AnyRunnerFromList<L>>, 'onDestroyed'>
    ): Promise<RunnerController<AnyRunnerFromList<L>>> | RunnerController<AnyRunnerFromList<L>>;
    private buildRunnerControllerAndAttachToList(
        config: Omit<IRunnerControllerConfig<AnyRunnerFromList<L>>, 'onDestroyed'>,
        runnerBridgeConstructor?: IRunnerBridgeConstructor
    ): Promise<RunnerController<AnyRunnerFromList<L>>> | RunnerController<AnyRunnerFromList<L>> {
        const runnerController = this.buildRunnerControllerWithoutInit({
            ...config,
            onDestroyed: () => this.runnerControllers.delete(runnerController),
        });
        if (runnerBridgeConstructor) {
            runnerController.init({runnerBridgeConstructor});
        } else {
            const initResult$ = runnerController.init();
            if (initResult$) {
                return initResult$.then(() => {
                    this.runnerControllers.add(runnerController);
                    return runnerController;
                })
            }
        }
        this.runnerControllers.add(runnerController);
        return runnerController;
    }
}
