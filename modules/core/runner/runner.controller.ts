import { IRunnerControllerAction, IRunnerControllerExecuteAction, RunnerControllerAction } from '../actions/runner-controller.actions';
import { IRunnerEnvironmentAction, IRunnerEnvironmentDestroyedAction, IRunnerEnvironmentDestroyErrorAction, IRunnerEnvironmentDisconnectedAction, IRunnerEnvironmentExecutedAction, IRunnerEnvironmentExecuteErrorAction, IRunnerEnvironmentResolvedAction, RunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { IRunnerError } from '../actions/runner-error';
import { RunnerErrorCode, RunnerErrorMessages } from '../errors/runners-errors';
import { NodeRunnerResolverBase } from '../resolver/node-runner.resolver';
import { PromisesResolver } from '../runner-promises';
import { IRunnerParameter, RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { ResolveRunner } from './resolved-runner';
import { IRunnerBridgeConstructor } from './runner-bridge';

export interface IRunnerControllerConfig<R extends RunnerConstructor> {
    bridgeConstructor: IRunnerBridgeConstructor<R>;
    port: MessagePort;
    onDisconnected?: () => void;
}

export class RunnerController<R extends RunnerConstructor> {
    public resolvedRunner: ResolveRunner<InstanceType<R>>;

    private promises = new PromisesResolver<
        IRunnerEnvironmentExecutedAction | IRunnerEnvironmentDestroyedAction
            | IRunnerEnvironmentDisconnectedAction | IRunnerEnvironmentResolvedAction,
        IRunnerEnvironmentExecuteErrorAction | IRunnerEnvironmentDestroyErrorAction | IRunnerError
    >();
    private lastActionId = 0;
    private port?: MessagePort;
    private onDisconnected?: () => void;

    constructor(config: IRunnerControllerConfig<R>) {
        this.resolvedRunner = new config.bridgeConstructor(this);
        this.port = config.port;
        this.port.onmessage = this.onPortMessage.bind(this);
        this.onDisconnected = config.onDisconnected;
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
    ): Promise<JsonObject | void> {
        const actionId = this.nextActionId();
        const executePromise$ = this.promises.promise<IRunnerEnvironmentExecutedAction>(actionId);
        const serializedArgumentsData = await NodeRunnerResolverBase.serializeArguments(args);
        this.sendAction(
            {
                type: RunnerControllerAction.EXECUTE,
                id: actionId,
                args: serializedArgumentsData.args,
                method: methodName,
            } as IRunnerControllerExecuteAction,
            serializedArgumentsData.transfer,
        );
        return (await executePromise$).response;
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

    public async resolveControl(): Promise<IRunnerEnvironmentResolvedAction> {
        const actionId = this.nextActionId();
        const promise$ = this.promises.promise<IRunnerEnvironmentResolvedAction>(actionId);
        this.sendAction({
            type: RunnerControllerAction.RESOLVE,
            id: actionId,
        });
        return promise$;
    }

    protected handleAction(
        action: IRunnerEnvironmentAction<Exclude<
            RunnerEnvironmentAction,
            RunnerEnvironmentAction.INITED | RunnerEnvironmentAction.INIT_ERROR
        >>,
    ): void {
        switch (action.type) {
            case RunnerEnvironmentAction.DISCONNECTED:
            case RunnerEnvironmentAction.EXECUTED:
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
        action: IRunnerControllerAction<Exclude<RunnerControllerAction, RunnerControllerAction.INIT>>,
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

    public onDisconnect(): void {
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
        this.port.close();
        this.port = undefined;
        this.onDisconnected?.();
    }
}
