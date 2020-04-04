import { IRunnerControllerAction, RunnerControllerAction } from '../actions/runner-controller.actions';
import { IRunnerEnvironmentAction, IRunnerEnvironmentDestroyedAction, IRunnerEnvironmentDisconnectedAction, IRunnerEnvironmentExecutedAction, IRunnerEnvironmentExecutedWithRunnerResultAction, IRunnerEnvironmentResolvedAction, RunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RunnerExecuteError, RunnerInitError, RunnerNotInitError } from '../errors/runner-errors';
import { WorkerRunnerError } from '../errors/worker-runner-error';
import { NodeRunnerResolverBase } from '../resolver/node-runner.resolver';
import { IRunnerParameter, IRunnerSerializedMethodResult, RunnerConstructor } from '../types/constructor';
import { IRunnerArgument } from '../types/runner-argument';
import { PromisesResolver } from '../utils/runner-promises';
import { ResolvedRunner } from './resolved-runner';
import { IRunnerBridgeConstructor } from './runner-bridge';

export interface IRunnerControllerConfig<R extends RunnerConstructor> {
    runnerId: number;
    port: MessagePort;
    runnerBridgeConstructors: Array<IRunnerBridgeConstructor<R>>;
    onDisconnected?: () => void;
}

export class RunnerController<R extends RunnerConstructor> {
    public readonly runnerId: number;
    public resolvedRunner: ResolvedRunner<InstanceType<R>>;

    private isMarkedForTransfer = false;
    private promises = new PromisesResolver<
        IRunnerEnvironmentExecutedAction | IRunnerEnvironmentDestroyedAction
            | IRunnerEnvironmentDisconnectedAction | IRunnerEnvironmentResolvedAction
            | IRunnerEnvironmentExecutedWithRunnerResultAction,
        WorkerRunnerError
    >();
    private lastActionId = 0;
    private port?: MessagePort;
    private readonly onDisconnected?: () => void;
    private readonly runnerBridgeConstructors: Array<IRunnerBridgeConstructor<R>>;

    protected readonly errorSerializer: WorkerRunnerErrorSerializer = WORKER_RUNNER_ERROR_SERIALIZER;

    constructor(config: IRunnerControllerConfig<R>) {
        const bridgeConstructor = config.runnerBridgeConstructors[config.runnerId];
        if (!bridgeConstructor) {
            throw new RunnerInitError();
        }
        this.resolvedRunner = new bridgeConstructor(this);
        this.runnerId = config.runnerId;
        this.port = config.port;
        this.port.onmessage = this.onPortMessage.bind(this);
        this.onDisconnected = config.onDisconnected;
        this.runnerBridgeConstructors = config.runnerBridgeConstructors;
    }

    protected onPortMessage(message: MessageEvent): void {
        this.handleAction(message.data);
    }

    protected nextActionId(): number {
        return this.lastActionId++;
    }

    public async execute(
        methodName: string,
        args: IRunnerParameter[],
    ): Promise<IRunnerSerializedMethodResult> {
        const actionId = this.nextActionId();
        const executePromise$ = this.promises
            .promise<IRunnerEnvironmentExecutedAction | IRunnerEnvironmentExecutedWithRunnerResultAction>(actionId);
        let serializedArgumentsData: {
            args: IRunnerArgument[];
            transfer: Transferable[];
        };
        try {
            serializedArgumentsData = await NodeRunnerResolverBase.serializeArguments(args);
        } catch (error) {
            this.promises.forget(actionId);
            throw error;
        }
        this.sendAction(
            {
                type: RunnerControllerAction.EXECUTE,
                id: actionId,
                args: serializedArgumentsData.args,
                method: methodName,
            },
            serializedArgumentsData.transfer,
        );
        const actionResult = await executePromise$;
        if (actionResult.type === RunnerEnvironmentAction.EXECUTED_WITH_RUNNER_RESULT) {
            return this.buildControlClone(actionResult.runnerId, actionResult.port).resolvedRunner;
        }
        return actionResult.response;
    }

    public async disconnect(): Promise<void> {
        const actionId = this.nextActionId();
        const disconnectPromise$ = this.promises.promise<IRunnerEnvironmentDisconnectedAction>(actionId);
        this.sendAction({
            type: RunnerControllerAction.DISCONNECT,
            id: actionId,
        });
        await disconnectPromise$;
        this.onDisconnect();
    }

    public async destroy(): Promise<void> {
        const actionId = this.nextActionId();
        const destroyPromise$ = this.promises.promise<IRunnerEnvironmentDestroyedAction>(actionId);
        this.sendAction({
            type: RunnerControllerAction.DESTROY,
            id: actionId,
        });
        await destroyPromise$;
    }

    protected buildControlClone(runnerId: number, port: MessagePort): this {
        return new (this.constructor as typeof RunnerController)({
            runnerId,
            runnerBridgeConstructors: this.runnerBridgeConstructors,
            port,
        }) as this;
    }

    public async cloneControl(): Promise<this> {
        return this.buildControlClone(this.runnerId, await this.resolveControl());
    }

    private transferControl(): MessagePort {
        if (!this.port) {
            throw new RunnerNotInitError();
        }
        const port = this.port;
        this.onDisconnect(false);
        return port;
    }

    public markForTransfer(): void {
        if (!this.port) {
            throw new RunnerNotInitError();
        }
        this.isMarkedForTransfer = true;
    }

    public async resolveControl(): Promise<MessagePort> {
        const actionId = this.nextActionId();
        const promise$ = this.promises.promise<IRunnerEnvironmentResolvedAction>(actionId);
        this.sendAction({
            type: RunnerControllerAction.RESOLVE,
            id: actionId,
        });
        return (await promise$).port;
    }

    public async resolveOrTransferControl(): Promise<MessagePort> {
        if (this.isMarkedForTransfer) {
            return this.transferControl();
        }
        return this.resolveControl();
    }

    protected handleAction(
        action: IRunnerEnvironmentAction,
    ): void {
        switch (action.type) {
            case RunnerEnvironmentAction.DISCONNECTED:
            case RunnerEnvironmentAction.EXECUTED:
            case RunnerEnvironmentAction.EXECUTED_WITH_RUNNER_RESULT:
            case RunnerEnvironmentAction.RESOLVED:
                this.promises.resolve(action.id, action);
                break;
            case RunnerEnvironmentAction.DESTROYED:
                const resolvedPromise = this.promises.forget(action.id);
                this.onDisconnect();
                resolvedPromise?.resolve(action);
                break;
            case RunnerEnvironmentAction.EXECUTE_ERROR:
                this.promises.reject(action.id, this.errorSerializer.deserialize(action));
                break;
            case RunnerEnvironmentAction.DESTROY_ERROR:
                const rejectedPromise = this.promises.forget(action.id);
                this.onDisconnect();
                rejectedPromise?.reject(this.errorSerializer.deserialize(action));
                break;
        }
    }

    protected sendAction(
        action: IRunnerControllerAction,
        transfer?: Transferable[],
    ): void {
        if (!this.port) {
            if (action.type === RunnerControllerAction.EXECUTE) {
                throw new RunnerExecuteError();
            } else {
                throw new RunnerNotInitError();
            }
        }
        this.port.postMessage(action, transfer as Transferable[]);
    }

    public onDisconnect(closePort = true): void {
        this.promises.promises.forEach(promise => {
            promise.reject(new RunnerNotInitError());
        });
        this.promises.promises.clear();
        if (!this.port) {
            throw new RunnerNotInitError();
        }
        if (closePort) {
            this.port.close();
        }
        this.port = undefined;
        this.onDisconnected?.();
    }
}
