import { IRunnerControllerAction, RunnerControllerAction } from '../actions/runner-controller.actions';
import { IRunnerEnvironmentAction, IRunnerEnvironmentDestroyedAction, IRunnerEnvironmentDestroyErrorAction, IRunnerEnvironmentDisconnectedAction, IRunnerEnvironmentExecutedAction, IRunnerEnvironmentExecutedWithRunnerResultAction, IRunnerEnvironmentExecuteErrorAction, IRunnerEnvironmentResolvedAction, RunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { IRunnerError } from '../actions/runner-error';
import { RunnerErrorCode, RunnerErrorMessages } from '../errors/runners-errors';
import { NodeRunnerResolverBase } from '../resolver/node-runner.resolver';
import { PromisesResolver } from '../runner-promises';
import { IRunnerParameter, IRunnerSerializedMethodResult, RunnerConstructor } from '../types/constructor';
import { ResolveRunner } from './resolved-runner';
import { IRunnerBridgeConstructor } from './runner-bridge';

export interface IRunnerControllerConfig<R extends RunnerConstructor> {
    runnerId: number;
    port: MessagePort;
    runnerBridgeConstructors: Array<IRunnerBridgeConstructor<R>>;
    onDisconnected?: () => void;
}

export class RunnerController<R extends RunnerConstructor> {
    public readonly runnerId: number;
    public resolvedRunner: ResolveRunner<InstanceType<R>>;

    private isMarkedForTransfer = false;
    private promises = new PromisesResolver<
        IRunnerEnvironmentExecutedAction | IRunnerEnvironmentDestroyedAction
            | IRunnerEnvironmentDisconnectedAction | IRunnerEnvironmentResolvedAction
            | IRunnerEnvironmentExecutedWithRunnerResultAction,
        IRunnerEnvironmentExecuteErrorAction | IRunnerEnvironmentDestroyErrorAction | IRunnerError
    >();
    private lastActionId = 0;
    private port?: MessagePort;
    private readonly onDisconnected?: () => void;
    private readonly runnerBridgeConstructors: Array<IRunnerBridgeConstructor<R>>;

    constructor(config: IRunnerControllerConfig<R>) {
        const bridgeConstructor = config.runnerBridgeConstructors[config.runnerId];
        if (!bridgeConstructor) {
            const error = new Error(RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND);
            throw {
                errorCode: RunnerErrorCode.RUNNER_INIT_ERROR,
                error,
                message: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
            } as IRunnerError;
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
        const serializedArgumentsData = await NodeRunnerResolverBase.serializeArguments(args);
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
            const error = new Error(RunnerErrorMessages.RUNNER_NOT_INIT);
            throw {
                errorCode: RunnerErrorCode.RUNNER_NOT_INIT,
                error,
                message: RunnerErrorMessages.RUNNER_NOT_INIT,
            } as IRunnerError;
        }
        const port = this.port;
        this.onDisconnect(false);
        return port;
    }

    public markForTransfer(): void {
        if (!this.port) {
            const error = new Error(RunnerErrorMessages.RUNNER_NOT_INIT);
            throw {
                error,
                errorCode: RunnerErrorCode.RUNNER_NOT_INIT,
                message: RunnerErrorMessages.RUNNER_NOT_INIT,
            } as IRunnerError;
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
                this.promises.reject(action.id, action);
                break;
            case RunnerEnvironmentAction.DESTROY_ERROR:
                const rejectedPromise = this.promises.forget(action.id);
                this.onDisconnect();
                rejectedPromise?.reject(action);
                break;
        }
    }

    protected sendAction(
        action: IRunnerControllerAction,
        transfer?: Transferable[],
    ): void {
        if (!this.port) {
            const error = new Error(RunnerErrorMessages.RUNNER_NOT_INIT);
            throw {
                errorCode: action.type === RunnerControllerAction.EXECUTE ?
                    RunnerErrorCode.RUNNER_EXECUTE_ERROR :
                    RunnerErrorCode.RUNNER_NOT_INIT,
                error,
                message: RunnerErrorMessages.RUNNER_NOT_INIT,
                stacktrace: error.stack,
            } as IRunnerError;
        }
        this.port.postMessage(action, transfer as Transferable[]);
    }

    public onDisconnect(closePort = true): void {
        const error = new Error(RunnerErrorMessages.RUNNER_NOT_INIT);
        this.promises.promises.forEach(promise => {
            promise.reject({
                error,
                errorCode: RunnerErrorCode.RUNNER_NOT_INIT,
                message: RunnerErrorMessages.RUNNER_NOT_INIT,
                stacktrace: error.stack,
            } as IRunnerError);
        });
        this.promises.promises.clear();
        if (!this.port) {
            throw {
                error,
                errorCode: RunnerErrorCode.RUNNER_NOT_INIT,
                message: RunnerErrorMessages.RUNNER_NOT_INIT,
                stacktrace: error.stack,
            } as IRunnerError;
        }
        if (closePort) {
            this.port.close();
        }
        this.port = undefined;
        this.onDisconnected?.();
    }
}
