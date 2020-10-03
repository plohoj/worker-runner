import { IConnectControllerErrorDeserializer } from '../../connect/controller/connect-controller-error-deserializer';
import { ConnectController } from '../../connect/controller/connect.controller';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RunnerInitError, WorkerNotInitError } from '../../errors/runner-errors';
import { WorkerRunnerError } from '../../errors/worker-runner-error';
import { IRunnerControllerConfig, RunnerController } from '../../runner/controller/runner.controller';
import { RunnerBridgeCollection } from '../../runner/runner-bridge/runner-bridge.collection';
import { RunnerBridge, RUNNER_BRIDGE_CONTROLLER } from '../../runner/runner-bridge/runner.bridge';
import { IRunnerParameter, IRunnerSerializedParameter, RunnerConstructor } from '../../types/constructor';
import { JsonObject } from '../../types/json-object';
import { IRunnerArgument, RunnerArgumentType } from '../../types/runner-argument';
import { TransferRunnerData } from '../../utils/transfer-runner-data';
import { IRunnerResolverConfigBase } from '../base-runner.resolver';
import { IBaseResolverBridge } from '../resolver-bridge/node/base-resolver.bridge';
import { LocalResolverBridge } from '../resolver-bridge/node/local-resolver.bridge';
import { ResolverBridge } from '../resolver-bridge/node/resolver.bridge';
import { IWorkerResolverRunnerInitedAction } from '../worker/worker-resolver.actions';
import { INodeResolverInitRunnerAction, NodeResolverAction } from './node-resolver.actions';

export interface INodeRunnerResolverConfigBase<R extends RunnerConstructor> extends IRunnerResolverConfigBase<R> {
    workerName?: string;
    workerPath?: string;
}

const DEFAULT_RUNNER_RESOLVER_BASE_CONFIG: Required<INodeRunnerResolverConfigBase<never>> = {
    workerName: 'Worker Runner',
    runners: [],
    workerPath: 'worker.js',
};

export class NodeRunnerResolverBase<R extends RunnerConstructor>  {

    protected runnerControllers = new Set<RunnerController<R>>();
    protected resolverBridge?: IBaseResolverBridge | LocalResolverBridge<R>;
    protected connectController?: ConnectController;

    protected readonly errorSerializer: WorkerRunnerErrorSerializer = WORKER_RUNNER_ERROR_SERIALIZER;
    protected readonly workerName: string;
    protected readonly workerPath: string;
    protected readonly runnerBridgeCollection: RunnerBridgeCollection<R>;

    private worker?: Worker;

    constructor(config: Readonly<INodeRunnerResolverConfigBase<R>>) {
        this.runnerBridgeCollection = new RunnerBridgeCollection({
            runners: config.runners || DEFAULT_RUNNER_RESOLVER_BASE_CONFIG.runners,
        });
        this.workerName = config.workerName || DEFAULT_RUNNER_RESOLVER_BASE_CONFIG.workerName;
        this.workerPath = config.workerPath || DEFAULT_RUNNER_RESOLVER_BASE_CONFIG.workerPath;
    }

    /** TODO extract serialize / deserialize arguments to component */
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
                const transferPort = await controller.resolveOrTransferControl();
                argsMap.set(index, {
                    type: RunnerArgumentType.RUNNER_INSTANCE,
                    port: transferPort,
                    runnerId: controller.runnerId,
                });
                serializedArguments.transfer.push(transferPort);
            } else {
                argsMap.set(index, {
                    type: RunnerArgumentType.JSON,
                    data: argument as JsonObject,
                });
            }
        }));
        for (let i = 0; i < args.length; i++) {
            serializedArguments.args.push(argsMap.get(i) as IRunnerArgument);
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
            errorDeserializer: this.errorSerializer
                .deserialize.bind(this.errorSerializer) as IConnectControllerErrorDeserializer,
            forceDestroyHandler: this.destroyByForce.bind(this),
        });
    }

    /** Returns a runner control object that will call the methods of the source instance */
    public async resolve<RR extends R>(runner: RR, ...args: IRunnerParameter[]): Promise<RunnerBridge> {
        const runnerId = this.runnerBridgeCollection.getRunnerId(runner);
        const action = await this.sendInitAction(runnerId, args);
        const runnerController = this.runnerControllerPartFactory({
            runnerId,
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
            throw new WorkerNotInitError();
        }
    }

    protected buildResolverBridge(): void {
        this.worker = new Worker(this.workerPath, { name: this.workerName });
        this.resolverBridge = new ResolverBridge({worker: this.worker});
    }

    protected runnerControllerPartFactory(config: {
        runnerId: number,
        port: MessagePort,
        onConnectionClosed?: () => void;
    }): RunnerController<R> {
        const runnerBridgeConstructor = this.runnerBridgeCollection.getRunnerBridgeConstructor(config.runnerId);
        const originalRunnerName = this.runnerBridgeCollection.getRunner(config.runnerId).name;
        return this.runnerControllerFactory({
            ...config,
            runnerBridgeConstructor,
            originalRunnerName,
            runnerControllerPartFactory: this.runnerControllerPartFactory.bind(this),
        });
    }

    protected runnerControllerFactory(config: IRunnerControllerConfig<R>): RunnerController<R> {
        return new RunnerController(config);
    }

    protected async sendInitAction(
        runnerId: number,
        args: IRunnerParameter[],
    ): Promise<IWorkerResolverRunnerInitedAction> {
        if (!this.connectController) {
            throw new WorkerNotInitError();
        }
        try {
            const serializedArguments = await NodeRunnerResolverBase.serializeArguments(args);
            const action: INodeResolverInitRunnerAction = {
                type: NodeResolverAction.INIT_RUNNER,
                runnerId,
                args: serializedArguments.args,
                transfer: serializedArguments.transfer,
            };
            return this.connectController.sendAction(action) as Promise<IWorkerResolverRunnerInitedAction>
        } catch (error) {
            if (error instanceof WorkerRunnerError) {
                throw error;
            }
            throw new RunnerInitError(this.errorSerializer.serialize(error, {
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                    runnerName: this.runnerBridgeCollection.getRunner(runnerId).name,
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
        throw new Error() // TODO
    }

    /**
     * Wraps the Runner and returns a Runner control object that will call the methods of the original Runner instance.
     * The original Runner instance will be executed in the same area in which it was wrapped.
     */
    protected wrapRunner(runnerInstance: InstanceType<R>): RunnerBridge {
        if (!this.resolverBridge) {
            throw new WorkerNotInitError();
        }
        const runnerId = this.runnerBridgeCollection.getRunnerIdByInstance(runnerInstance);
        const port = (this.resolverBridge as LocalResolverBridge<R>).workerRunnerResolver.wrapRunner(runnerInstance);
        const runnerController = this.runnerControllerPartFactory({
            runnerId,
            port,
            onConnectionClosed: () => this.runnerControllers.delete(runnerController),
        })
        this.runnerControllers.add(runnerController);
        return runnerController.resolvedRunner;
    }
}
