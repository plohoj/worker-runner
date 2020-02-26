import { INodeResolverWorkerDestroyAction, NodeResolverAction } from '../actions/node-resolver.actions';
import { IRunnerControllerInitAction, RunnerControllerAction } from '../actions/runner-controller.actions';
import { IRunnerEnvironmentInitedAction, IRunnerEnvironmentInitErrorAction, RunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { errorActionToRunnerError, IRunnerError } from '../actions/runner-error';
import { IWorkerResolverDestroyedAction, WorkerResolverAction } from '../actions/worker-resolver.actions';
import { RunnerErrorCode, RunnerErrorMessages } from '../errors/runners-errors';
import { IPromiseMethods, PromisesResolver } from '../runner-promises';
import { resolveRunnerBridgeConstructor } from '../runner/bridge-constructor.resolver';
import { ResolveRunnerArguments } from '../runner/resolved-runner';
import { IRunnerBridgeConstructor, RunnerBridge, runnerBridgeController } from '../runner/runner-bridge';
import { RunnerController } from '../runner/runner.controller';
import { IRunnerParameter, RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { IRunnerArgument, IRunnerEnvironmentArgument, IRunnerJSONArgument, RunnerArgumentType } from '../types/runner-argument';
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
    private initPromises = new PromisesResolver<IRunnerEnvironmentInitedAction>();
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

    public static async serializeArguments(args: IRunnerParameter[],
    ): Promise<{
        args: IRunnerArgument[]
        transfer: Transferable[],
    }> {
        const serializedArgs = {
            args: new Array<IRunnerArgument>(),
            transfer: new Array<Transferable>(),
        };
        const argsMap = new Map<number, IRunnerArgument>();
        await Promise.all(args.map(async (argument, index) => {
            if (RunnerBridge.isRunnerBridge(argument)) {
                const action = await (argument as RunnerBridge)[runnerBridgeController].resolveControl();
                argsMap.set(index, {
                    type: RunnerArgumentType.RUNNER_INSTANCE,
                    runnerId: action.runnerId,
                    port: action.port,
                } as IRunnerEnvironmentArgument);
                serializedArgs.transfer.push(action.port);
            } else {
                argsMap.set(index, {
                    type: RunnerArgumentType.JSON,
                    data: argument as JsonObject,
                } as IRunnerJSONArgument);
            }
        }));
        for (let i = 0; i < args.length; i++) {
            serializedArgs.args.push(argsMap.get(i) as IRunnerArgument);
        }
        return serializedArgs;
    }

    public async run(): Promise<void> {
        this.runnerBridgeConstructors = this.config.runners.map(runner => resolveRunnerBridgeConstructor(runner));
        await this.initWorker();
    }

    public async resolve<RR extends R>(runner: RR, ...args: IRunnerParameter[]): Promise<RunnerBridge> {
        const runnerId = this.config.runners.indexOf(runner);
        const action = await this.sendInitAction(runnerId, args);
        const runnerController: RunnerController<R> = new this.RunnerControllerConstructor( {
            onDisconnected: () => this.runnerControllers.delete(runnerController),
            port: action.port,
            runnerBridgeConstructors: this.runnerBridgeConstructors,
            bridgeConstructor: this.runnerBridgeConstructors[runnerId],
        });
        this.runnerControllers.add(runnerController);
        return runnerController.resolvedRunner;
    }

    protected async sendInitAction(
        runnerId: number,
        args: ResolveRunnerArguments<ConstructorParameters<RunnerConstructor>>,
    ): Promise<IRunnerEnvironmentInitedAction> {
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
                    type: RunnerControllerAction.INIT,
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

    protected handleWorkerAction(action: IRunnerEnvironmentInitedAction | IRunnerEnvironmentInitErrorAction
        | IWorkerResolverDestroyedAction,
    ): void {
        switch (action.type) {
            case RunnerEnvironmentAction.INITED:
                this.initPromises.resolve(action.id, action);
                break;
            case RunnerEnvironmentAction.INIT_ERROR:
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
                if (message.data && message.data.type === WorkerResolverAction.INIT) {
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
     * Destroy workers for runnable resolver
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
        action: INodeResolverWorkerDestroyAction | IRunnerControllerInitAction,
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
