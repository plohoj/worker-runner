import { IConnectControllerErrorDeserializer } from '../../connect/controller/connect-controller-error-deserializer';
import { ConnectController } from '../../connect/controller/connect.controller';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { ConnectionWasClosedError, RunnerNotFound } from '../../errors/runner-errors';
import { WorkerRunnerError, WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { IRunnerControllerConfig, RunnerController } from '../../runner/controller/runner.controller';
import { RunnerBridge, RUNNER_BRIDGE_CONTROLLER } from '../../runner/runner-bridge/runner.bridge';
import { AnyRunnerFromList, RunnersListController, RunnersList, RunnerToken, RunnerIdentifier } from '../../runner/runner-bridge/runners-list.controller';
import { IRunnerParameter, IRunnerSerializedParameter } from '../../types/constructor';
import { JsonObject } from '../../types/json-object';
import { RunnerResolverPossibleConnection } from '../../types/possible-connection';
import { IRunnerArgument, RunnerArgumentType } from '../../types/runner-argument';
import { TransferRunnerData } from '../../utils/transfer-runner-data';
import { IRunnerResolverConfigBase } from '../base-runner.resolver';
import { IHostResolverRunnerInitedAction, IHostResolverRunnerInitErrorAction, HostResolverAction } from '../host/host-resolver.actions';
import { ClientResolverBridge } from '../resolver-bridge/client/client-resolver.bridge';
import { LocalResolverBridge } from '../resolver-bridge/local/local-resolver.bridge';
import { IClientResolverInitRunnerAction, ClientResolverAction } from './client-resolver.actions';

/**
 * @deprecated
 * @see IClientRunnerResolverPossibleConnectionConfigBase
 * @see IClientRunnerResolverConfigBase
 */
export interface INodeRunnerResolverWorkerConfigBase {
    /**
     * @default 'Worker Runner'
     * @deprecated
     * @see IClientRunnerResolverPossibleConnectionConfigBase
     */
    workerName?: string;
    /**
     * @default 'worker.js'
     * @deprecated
     * @see IClientRunnerResolverPossibleConnectionConfigBase
     */
    workerPath?: string; 
}

export interface IClientRunnerResolverPossibleConnectionConfigBase {
    connection: RunnerResolverPossibleConnection;
}

export type IClientRunnerResolverConnectionConfigBase
    = INodeRunnerResolverWorkerConfigBase | IClientRunnerResolverPossibleConnectionConfigBase;

export type IClientRunnerResolverConfigBase<L extends RunnersList>
    = IRunnerResolverConfigBase<L> & IClientRunnerResolverConnectionConfigBase

const DEFAULT_RUNNER_RESOLVER_BASE_CONFIG: Required<
    IClientRunnerResolverConfigBase<never[]> & INodeRunnerResolverWorkerConfigBase
> = {
    workerName: 'Worker Runner',
    runners: [],
    workerPath: 'worker.js',
};

export class ClientRunnerResolverBase<L extends RunnersList>  {

    protected runnerControllers = new Set<RunnerController<AnyRunnerFromList<L>>>();
    protected resolverBridge?: ClientResolverBridge;
    protected connectController?: ConnectController;

    protected readonly errorSerializer: WorkerRunnerErrorSerializer = WORKER_RUNNER_ERROR_SERIALIZER;
    protected readonly runnersListController: RunnersListController<L>;

    private readonly connectionConfig: IClientRunnerResolverConnectionConfigBase;
    /** Exist only if connection config not have worker / port */
    private worker?: Worker;

    constructor(config: IClientRunnerResolverConfigBase<L>) {
        this.runnersListController = new RunnersListController({
            runners: config.runners || DEFAULT_RUNNER_RESOLVER_BASE_CONFIG.runners,
        });
        if ('connection' in config) {
            this.connectionConfig = {
                connection: config.connection
            };
        } else {
            this.connectionConfig = {
                workerName: config.workerName,
                workerPath: config.workerPath,
            };
        }
    }

    // TODO extract serialize / deserialize arguments to component
    public static async serializeArguments(
        args: IRunnerParameter[],
    ): Promise<{
        args: IRunnerArgument[]
        transfer: Transferable[],
    }> {
        const serializedArguments = {
            args: new Array<IRunnerArgument>(),
            transfer: new Array<Transferable>(),
        };
        const argsMap = new Map<number, IRunnerArgument>();
        await Promise.all(args.map(async (argumentWithTransferData, index) => {
            let argument: IRunnerSerializedParameter;
            if (argumentWithTransferData instanceof TransferRunnerData) {
                serializedArguments.transfer.push(...argumentWithTransferData.transfer);
                argument = argumentWithTransferData.data;
            } else {
                argument = argumentWithTransferData;
            }
            if (RunnerBridge.isRunnerBridge(argument)) {
                const controller = (argument as RunnerBridge)[RUNNER_BRIDGE_CONTROLLER];
                // TODO close all connection after throw error 
                const transferPort = await controller.resolveOrTransferControl();
                argsMap.set(index, {
                    type: RunnerArgumentType.RUNNER_INSTANCE,
                    port: transferPort,
                    token: controller.token,
                });
                serializedArguments.transfer.push(transferPort);
            } else {
                argsMap.set(index, {
                    type: RunnerArgumentType.JSON,
                    data: argument as JsonObject,
                });
            }
        }));
        for (let argumentIndex = 0; argumentIndex < args.length; argumentIndex++) {
            serializedArguments.args.push(argsMap.get(argumentIndex) as IRunnerArgument);
        }
        return serializedArguments;
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
    public async resolve(identifier: RunnerIdentifier<L>, ...args: IRunnerParameter[]): Promise<RunnerBridge> {
        let token: RunnerToken;
        if (typeof identifier === 'string') {
            token = identifier;
            if (!this.runnersListController.checkToken(token)) {
                throw new RunnerNotFound({
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({ token: token })
                });
            }
        } else {
            token = this.runnersListController.getRunnerToken(identifier);
        }
        const action = await this.sendInitAction(token, args);
        const runnerController = this.buildRunnerControllerByPartConfig({
            token: token,
            port: action.port,
            onConnectionClosed: () => this.runnerControllers.delete(runnerController),
        })
        this.runnerControllers.add(runnerController);
        return runnerController.resolvedRunner;
    }

    /** Destroying of all resolved Runners instance */
    public async destroy(): Promise<void> {
        if (this.connectController) {
            await this.connectController.destroy();
            this.destroyRunnerControllers();
            this.worker?.terminate();
            this.worker = undefined;
            this.connectController = undefined;
            this.resolverBridge = undefined;
        } else {
            throw new ConnectionWasClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.HOST_RESOLVER_NOT_INIT(),
            });
        }
    }

    protected buildResolverBridge(): void {
        let connection: RunnerResolverPossibleConnection;
        if ('connection' in this.connectionConfig) {
            connection = this.connectionConfig.connection;
        } else {
            connection = new Worker(
                this.connectionConfig.workerPath || DEFAULT_RUNNER_RESOLVER_BASE_CONFIG.workerPath,
                { name: this.connectionConfig.workerName || DEFAULT_RUNNER_RESOLVER_BASE_CONFIG.workerName },
            );
            this.worker = connection;
        }
        this.resolverBridge = new ClientResolverBridge({ connection });
    }

    protected buildRunnerControllerByPartConfig(config: {
        token: RunnerToken,
        port: MessagePort,
        onConnectionClosed?: () => void;
    }): RunnerController<AnyRunnerFromList<L>> {
        const runnerBridgeConstructor = this.runnersListController.getRunnerBridgeConstructor(config.token);
        const originalRunnerName = this.runnersListController.getRunner(config.token).name;
        return this.buildRunnerController({
            ...config,
            runnerBridgeConstructor,
            originalRunnerName,
            runnerControllerPartFactory: this.buildRunnerControllerByPartConfig.bind(this),
        });
    }

    protected buildRunnerController(
        config: IRunnerControllerConfig<AnyRunnerFromList<L>>
    ): RunnerController<AnyRunnerFromList<L>> {
        return new RunnerController(config);
    }

    protected async sendInitAction(
        token: RunnerToken,
        args: IRunnerParameter[],
    ): Promise<IHostResolverRunnerInitedAction> {
        if (!this.connectController) {
            throw new ConnectionWasClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.HOST_RESOLVER_NOT_INIT(),
            });
        }
        try {
            const serializedArguments = await ClientRunnerResolverBase.serializeArguments(args);
            const action: IClientResolverInitRunnerAction = {
                type: ClientResolverAction.INIT_RUNNER,
                token: token,
                args: serializedArguments.args,
                transfer: serializedArguments.transfer,
            };
            const responseAction: IHostResolverRunnerInitedAction | IHostResolverRunnerInitErrorAction
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
                    runnerName: this.runnersListController.getRunner(token).name,
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
    protected wrapRunner(runnerInstance: InstanceType<AnyRunnerFromList<L>>): RunnerBridge {
        if (!this.resolverBridge) {
            throw new ConnectionWasClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.HOST_RESOLVER_NOT_INIT(),
            });
        }
        const token = this.runnersListController.getRunnerTokenByInstance(runnerInstance);
        const port = (this.resolverBridge as LocalResolverBridge<L>).hostRunnerResolver.wrapRunner(runnerInstance);
        const runnerController = this.buildRunnerControllerByPartConfig({
            token,
            port,
            onConnectionClosed: () => this.runnerControllers.delete(runnerController),
        })
        this.runnerControllers.add(runnerController);
        return runnerController.resolvedRunner;
    }
}
