import { INodeResolverAction, NodeResolverAction } from '../actions/node-resolver.actions';
import { IWorkerResolverAction, IWorkerResolverRunnerInitedAction, WorkerResolverAction } from '../actions/worker-resolver.actions';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../errors/error-message';
import { WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RunnerInitError, WorkerNotInitError } from '../errors/runner-errors';
import { WorkerRunnerError, WorkerRunnerUnexpectedError } from '../errors/worker-runner-error';
import { resolveRunnerBridgeConstructor } from '../runner/bridge-constructor.resolver';
import { IRunnerBridgeConstructor, RunnerBridge, RUNNER_BRIDGE_CONTROLLER } from '../runner/runner-bridge';
import { RunnerController } from '../runner/runner.controller';
import { IRunnerParameter, IRunnerSerializedParameter, RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { IRunnerArgument, RunnerArgumentType } from '../types/runner-argument';
import { IPromiseMethods, PromisesResolver } from '../utils/runner-promises';
import { TransferRunnerData } from '../utils/transfer-runner-data';
import { IRunnerResolverConfigBase } from './base-runner.resolver';

export interface INodeRunnerResolverConfigBase<R extends RunnerConstructor> extends IRunnerResolverConfigBase<R> {
    workerName?: string;
    workerPath?: string;
}

const DEFAULT_RUNNER_RESOLVER_BASE_CONFIG: Required<INodeRunnerResolverConfigBase<never>> = {
    workerName: 'Worker Runner',
    runners: [],
    workerPath: 'worker.js',
};

export abstract class NodeRunnerResolverBase<R extends RunnerConstructor>  {

    protected destroyPromise?: IPromiseMethods<void>;
    protected readonly RunnerControllerConstructor = RunnerController;
    protected readonly errorSerializer: WorkerRunnerErrorSerializer = WORKER_RUNNER_ERROR_SERIALIZER;

    protected runnerControllers = new Set<RunnerController<R>>();
    protected runnerBridgeConstructors = new Array<IRunnerBridgeConstructor<R>>();
    protected readonly workerName: string;
    protected readonly runners: ReadonlyArray<R>;
    protected readonly workerPath: string;

    private initPromises = new PromisesResolver<IWorkerResolverRunnerInitedAction, WorkerRunnerError>();
    private lastActionId = 0;

    private worker?: Worker;
    private workerMessageHandler = this.onWorkerMessage.bind(this);

    constructor(config: Readonly<INodeRunnerResolverConfigBase<R>>) {
        this.runners = config.runners || DEFAULT_RUNNER_RESOLVER_BASE_CONFIG.runners;
        this.workerName = config.workerName || DEFAULT_RUNNER_RESOLVER_BASE_CONFIG.workerName;
        this.workerPath = config.workerPath || DEFAULT_RUNNER_RESOLVER_BASE_CONFIG.workerPath;
    }

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
        this.runnerBridgeConstructors = this.runners.map(runner => resolveRunnerBridgeConstructor(runner));
        await this.initWorker();
    }

    /** Returns a runner control object that will call the methods of the source instance */
    public async resolve<RR extends R>(runner: RR, ...args: IRunnerParameter[]): Promise<RunnerBridge> {
        const runnerId = this.getRunnerId(runner);
        const action = await this.sendInitAction(runnerId, args);
        return this.buildRunnerController(runnerId, action.port).resolvedRunner;
    }

    /**
     * Destroying of all resolved Runners instance
     * @param force Destroy by skipping the call the destruction method on the remaining instances
     */
    public async destroy(force = false): Promise<void> {
        if (this.worker) {
            const destroyPromise$ = new Promise<void>((resolve, reject) => {
                this.destroyPromise = {resolve, reject};
            });
            this.sendAction({
                type: NodeResolverAction.DESTROY,
                force,
            });
            await destroyPromise$;
            this.destroyRunnerControllers();
            this.worker.terminate();
            this.worker = undefined;
        } else {
            throw new WorkerNotInitError();
        }
    }

    protected getRunnerId(runner: R): number {
        const runnerId = this.runners.indexOf(runner);
        if (runnerId < 0) {
            throw new RunnerInitError({
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({runnerName: runner.name}),
            });
        }
        return runnerId;
    }

    protected buildRunnerController(
        runnerId: number,
        port: MessagePort,
    ): RunnerController<R> {
        const runnerController: RunnerController<R> = new this.RunnerControllerConstructor( {
            onDisconnected: () => this.runnerControllers.delete(runnerController),
            port,
            runnerBridgeConstructors: this.runnerBridgeConstructors,
            runnerId,
            runners: this.runners,
        });
        this.runnerControllers.add(runnerController);
        return runnerController;
    }

    protected async sendInitAction(
        runnerId: number,
        args: IRunnerParameter[],
    ): Promise<IWorkerResolverRunnerInitedAction> {
        try {
            const actionId = this.nextActionId();
            const promise$ = this.initPromises.promise(actionId);
            const serializedArguments = await NodeRunnerResolverBase.serializeArguments(args);
            this.sendAction(
                {
                    type: NodeResolverAction.INIT_RUNNER,
                    id: actionId,
                    runnerId,
                    args: serializedArguments.args,
                },
                serializedArguments.transfer,
            );
            return await promise$;
        } catch (error) {
            if (error instanceof WorkerRunnerError) {
                throw error;
            }
            throw new RunnerInitError(this.errorSerializer.serialize(error, {
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                    runnerName: this.runners[runnerId].name,
                }),
            }));
        }
    }

    protected nextActionId(): number {
        return this.lastActionId++;
    }

    protected onWorkerMessage(message: MessageEvent): void {
        this.handleWorkerAction(message.data);
    }

    protected handleWorkerAction(action: IWorkerResolverAction): void {
        switch (action.type) {
            case WorkerResolverAction.RUNNER_INITED:
                this.initPromises.resolve(action.id, action);
                break;
            case WorkerResolverAction.RUNNER_INIT_ERROR:
                this.initPromises.reject(action.id, this.errorSerializer.deserialize(action));
                break;
            case WorkerResolverAction.DESTROYED:
                if (!this.destroyPromise) {
                    throw new WorkerRunnerUnexpectedError({
                        message: WORKER_RUNNER_ERROR_MESSAGES.WORKER_DESTROYED_WITHOUT_CALL(),
                    });
                }
                this.destroyPromise.resolve();
                this.destroyPromise = undefined;
                break;
        }
    }

    protected async initWorker(): Promise<void> {
        const worker = new Worker(this.workerPath, { name: this.workerName });
        await new Promise(resolve => {
            worker.onmessage = (message) => {
                if (message.data && message.data.type === WorkerResolverAction.WORKER_INITED) {
                    resolve();
                }
            };
        });
        this.worker = worker;
        this.worker.addEventListener('message', this.workerMessageHandler);
    }

    protected destroyRunnerControllers(): void {
        this.runnerControllers.forEach(state => state.onDisconnect());
        this.runnerControllers.clear();
    }

    protected sendAction(
        action: INodeResolverAction,
        transfer?: Transferable[],
    ): void {
        if (this.worker) { // TODO use MessageChanel
            this.worker.postMessage(action, transfer as Transferable[]);
        } else {
            throw new WorkerNotInitError();
        }
    }
}
