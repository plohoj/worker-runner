import { INodeResolverAction, NodeResolverAction } from '../actions/node-resolver.actions';
import { errorActionToRunnerError, IRunnerError } from '../actions/runner-error';
import { IWorkerResolverAction, IWorkerResolverRunnerInitedAction, WorkerResolverAction } from '../actions/worker-resolver.actions';
import { RunnerErrorCode, RunnerErrorMessages } from '../errors/runners-errors';
import { IPromiseMethods, PromisesResolver } from '../runner-promises';
import { resolveRunnerBridgeConstructor } from '../runner/bridge-constructor.resolver';
import { IRunnerBridgeConstructor, RunnerBridge, runnerBridgeController } from '../runner/runner-bridge';
import { RunnerController } from '../runner/runner.controller';
import { TransferRunnerData } from '../transfer-runner-data';
import { IRunnerParameter, IRunnerSerializedParameter, RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { IRunnerArgument, RunnerArgumentType } from '../types/runner-argument';
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
    private initPromises = new PromisesResolver<IWorkerResolverRunnerInitedAction>();
    private lastActionId = 0;

    private worker?: Worker;
    private workerMessageHandler = this.onWorkerMessage.bind(this);
    protected destroyPromise?: IPromiseMethods<void>;
    protected RunnerControllerConstructor = RunnerController;

    protected runnerControllers = new Set<RunnerController<R>>();
    protected runnerBridgeConstructors = new Array<IRunnerBridgeConstructor<R>>();
    protected config: Required<INodeRunnerResolverConfigBase<R>>;

    constructor(config: INodeRunnerResolverConfigBase<R>) {
        this.config = {
            ...DEFAULT_RUNNER_RESOLVER_BASE_CONFIG,
            ...config,
        };
    }

    public static async serializeArguments(
        args: IRunnerParameter[],
    ): Promise<{
        args: IRunnerArgument[]
        transfer: Transferable[],
    }> {
        const serializedArgs = {
            args: new Array<IRunnerArgument>(),
            transfer: new Array<Transferable>(),
        };
        const argsMap = new Map<number, IRunnerArgument>();
        await Promise.all(args.map(async (argumentWithTransferData, index) => {
            let argument: IRunnerSerializedParameter;
            if (argumentWithTransferData instanceof TransferRunnerData) {
                serializedArgs.transfer.push(...argumentWithTransferData.transfer);
                argument = argumentWithTransferData.data;
            } else {
                argument = argumentWithTransferData;
            }
            if (RunnerBridge.isRunnerBridge(argument)) {
                const controller = (argument as RunnerBridge)[runnerBridgeController];
                const transferPort = await controller.resolveOrTransferControl();
                argsMap.set(index, {
                    type: RunnerArgumentType.RUNNER_INSTANCE,
                    port: transferPort,
                    runnerId: controller.runnerId,
                });
                serializedArgs.transfer.push(transferPort);
            } else {
                argsMap.set(index, {
                    type: RunnerArgumentType.JSON,
                    data: argument as JsonObject,
                });
            }
        }));
        for (let i = 0; i < args.length; i++) {
            serializedArgs.args.push(argsMap.get(i) as IRunnerArgument);
        }
        return serializedArgs;
    }

    /** Launches and prepares RunnerResolver for work */
    public async run(): Promise<void> {
        this.runnerBridgeConstructors = this.config.runners.map(runner => resolveRunnerBridgeConstructor(runner));
        await this.initWorker();
    }

    /** Returns a runner control object that will call the methods of the source instance */
    public async resolve<RR extends R>(runner: RR, ...args: IRunnerParameter[]): Promise<RunnerBridge> {
        const runnerId = this.getRunnerId(runner);
        const action = await this.sendInitAction(runnerId, args);
        return this.buildRunnerController(runnerId, action.port).resolvedRunner;
    }

    protected getRunnerId(runner: R) {
        const runnerId = this.config.runners.indexOf(runner);
        if (runnerId < 0) {
            const error = new Error(RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND);
            throw {
                errorCode: RunnerErrorCode.RUNNER_INIT_ERROR,
                error,
                message: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
                stacktrace: error.stack,
            } as IRunnerError;
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
        });
        this.runnerControllers.add(runnerController);
        return runnerController;
    }

    protected async sendInitAction(
        runnerId: number,
        args: IRunnerParameter[],
    ): Promise<IWorkerResolverRunnerInitedAction> {
        if (runnerId < 0) {
            const error = new Error(RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND);
            throw {
                error,
                message: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
                errorCode: RunnerErrorCode.RUNNER_INIT_ERROR,
                stacktrace: error.stack,
            } as IRunnerError;
        }
        try {
            const actionId = this.nextActionId();
            const promise$ = this.initPromises.promise(actionId);
            const serializedArgs = await NodeRunnerResolverBase.serializeArguments(args);
            this.sendAction(
                {
                    type: NodeResolverAction.INIT_RUNNER,
                    id: actionId,
                    runnerId,
                    args: serializedArgs.args,
                },
                serializedArgs.transfer,
            );
            const action = await promise$;
            return action;
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
    }

    protected nextActionId(): number {
        return this.lastActionId++;
    }

    protected onWorkerMessage(message: MessageEvent): void {
        this.handleWorkerAction(message.data);
    }

    protected handleWorkerAction(action: IWorkerResolverAction,
    ): void {
        switch (action.type) {
            case WorkerResolverAction.RUNNER_INITED:
                this.initPromises.resolve(action.id, action);
                break;
            case WorkerResolverAction.RUNNER_INIT_ERROR:
                this.initPromises.reject(action.id, action);
                break;
            case WorkerResolverAction.DESTROYED:
                if (!this.destroyPromise) {
                    throw new Error('An action was received about the successful destroy,'
                        + ' but the destroy method was not previously called');
                }
                this.destroyPromise.resolve();
                this.destroyPromise = undefined;
                break;
        }
    }

    protected async initWorker(): Promise<void> {
        const worker = new Worker(this.config.workerPath, { name: this.config.workerName });
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
            const error = new Error(RunnerErrorMessages.WORKER_NOT_INIT);
            throw {
                errorCode: RunnerErrorCode.WORKER_NOT_INIT,
                error,
                message: RunnerErrorMessages.WORKER_NOT_INIT,
                stacktrace: error.stack,
            } as IRunnerError;
        }
    }

    protected sendAction(
        action: INodeResolverAction,
        transfer?: Transferable[],
    ): void {
        if (this.worker) { // TO use MessageChanel
            this.worker.postMessage(action, transfer as Transferable[]);
        } else {
            const error = new Error(RunnerErrorMessages.WORKER_NOT_INIT);
            throw {
                errorCode: RunnerErrorCode.WORKER_NOT_INIT,
                error,
                message: RunnerErrorMessages.WORKER_NOT_INIT,
                stacktrace: error.stack,
            } as IRunnerError;
        }
    }
}
