import { IRunnerControllerAction, IRunnerControllerDestroyAction, IRunnerControllerExecuteAction, RunnerControllerAction } from '../actions/runner-controller.actions';
import { IRunnerEnvironmentAction, IRunnerEnvironmentDestroyedAction, IRunnerEnvironmentDestroyErrorAction, IRunnerEnvironmentExecutedAction, IRunnerEnvironmentExecuteErrorAction, IRunnerEnvironmentResolvedAction, RunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { IRunnerError } from '../actions/runner-error';
import { RunnerErrorCode, RunnerErrorMessages } from '../errors/runners-errors';
import { PromisesResolver } from '../runner-promises';
import { RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { ResolveRunner } from './resolved-runner';
import { IRunnerBridgeConstructor } from './runner-bridge';

export interface IRunnerControllerConfig<R extends RunnerConstructor> {
    bridgeConstructor: IRunnerBridgeConstructor<R>;
    port: MessagePort;
    onDestroyed: () => void;
}

export class RunnerController<R extends RunnerConstructor> {
    public resolvedRunner: ResolveRunner<InstanceType<R>>;

    private promises = new PromisesResolver<
        IRunnerEnvironmentExecutedAction | IRunnerEnvironmentDestroyedAction,
        IRunnerEnvironmentExecuteErrorAction | IRunnerEnvironmentDestroyErrorAction | IRunnerError
    >();
    private resolveControlPromises = new PromisesResolver<IRunnerEnvironmentResolvedAction>();
    private lastResolvedControlPromise = 0;
    private port?: MessagePort;
    private onDestroyed: () => void;

    constructor(config: IRunnerControllerConfig<R>) {
        this.resolvedRunner = new config.bridgeConstructor(this);
        this.port = config.port;
        this.port.onmessage = this.onPortMessage.bind(this);
        this.onDestroyed = config.onDestroyed;
    }

    protected onPortMessage(message: MessageEvent): void {
        this.handleAction(message.data);
    }

    public async execute(action: IRunnerControllerExecuteAction, transfer?: Transferable[]): Promise<JsonObject>;
    public async execute(action: IRunnerControllerDestroyAction): Promise<void>;
    public async execute(
        action: IRunnerControllerExecuteAction | IRunnerControllerDestroyAction,
        transfer?: Transferable[],
    ): Promise<JsonObject | void> {
        switch (action.type) {
            case RunnerControllerAction.EXECUTE:
                const executePromise$ = this.promises.promise<IRunnerEnvironmentExecutedAction>(action.id);
                this.sendAction(action, transfer);
                return (await executePromise$).response;
            case RunnerControllerAction.DESTROY:
                const destroyPromise$ = this.promises.promise<IRunnerEnvironmentDestroyedAction>(action.id);
                this.sendAction(action);
                await destroyPromise$;
                return;
        }
    }

    public async resolveControl(): Promise<IRunnerEnvironmentResolvedAction> {
        const actionId = this.lastResolvedControlPromise++;
        const promise$ = this.resolveControlPromises.promise(actionId);
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
            case RunnerEnvironmentAction.EXECUTED:
                this.promises.resolve(action.id, action);
                return;
            case RunnerEnvironmentAction.EXECUTE_ERROR:
                this.promises.reject(action.id, action);
                return;
            case RunnerEnvironmentAction.DESTROYED:
                this.promises.resolve(action.id, action);
                this.destroy();
                this.onDestroyed();
                return;
            case RunnerEnvironmentAction.DESTROY_ERROR:
                this.promises.reject(action.id, action);
                this.destroy();
                this.onDestroyed();
                return;
            case RunnerEnvironmentAction.RESOLVED:
                this.resolveControlPromises.resolve(action.id, action);
                return;
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

    public destroy(): void {
        const error = new Error(RunnerErrorMessages.RUNNER_NOT_INIT);
        this.promises.promises.forEach(promise => {
            promise.reject({
                error,
                errorCode: RunnerErrorCode.RUNNER_NOT_INIT,
                message: RunnerErrorMessages.RUNNER_NOT_INIT,
                stacktrace: error.stack,
            } as IRunnerError);
        });
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
    }
}
