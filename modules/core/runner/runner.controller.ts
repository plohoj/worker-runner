import { IRunnerControllerAction, IRunnerControllerDestroyAction, IRunnerControllerExecuteAction, RunnerControllerAction } from '../actions/runner-controller.actions';
import { IRunnerEnvironmentAction, IRunnerEnvironmentDestroyErrorAction, RunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { IRunnerError } from '../actions/runner-error';
import { RunnerErrorCode, RunnerErrorMessages } from '../errors/runners-errors';
import { IPromiseMethods, PromisesResolver } from '../runner-promises';
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

    private executePromises = new PromisesResolver<JsonObject>();
    private destroyPromise?: IPromiseMethods<void, IRunnerEnvironmentDestroyErrorAction>;
    private port?: MessagePort;
    private onDestroyed: () => void;
    private executeHandler = this.execute.bind(this);

    constructor(config: IRunnerControllerConfig<R>) {
        this.resolvedRunner = new config.bridgeConstructor(this.executeHandler);
        this.port = config.port;
        this.port.onmessage = this.onPortMessage.bind(this);
        this.onDestroyed = config.onDestroyed;
    }

    protected onPortMessage(message: MessageEvent): void {
        this.handleAction(message.data);
    }

    public async execute(action: IRunnerControllerExecuteAction): Promise<JsonObject>;
    public async execute(action: IRunnerControllerDestroyAction): Promise<void>;
    public async execute(
        action: IRunnerControllerExecuteAction | IRunnerControllerDestroyAction,
    ): Promise<JsonObject | void> {
        let promise$: Promise<JsonObject | void> | undefined;
        switch (action.type) {
            case RunnerControllerAction.EXECUTE:
                promise$ = this.executePromises.promise(action.id);
                break;
            case RunnerControllerAction.DESTROY:
                promise$ = new Promise((resolve, reject) => {
                    this.destroyPromise = {resolve, reject};
                });
                break;
        }
        if (promise$) {
            this.sendAction(action);
            return promise$;
        }
        throw Error(`Action "${action.type}" not found`);
    }

    protected handleAction(
        action: IRunnerEnvironmentAction<Exclude<
            RunnerEnvironmentAction,
            RunnerEnvironmentAction.INITED | RunnerEnvironmentAction.INIT_ERROR
        >>,
    ): void {
        switch (action.type) {
            case RunnerEnvironmentAction.EXECUTED:
                this.executePromises.resolve(action.id, action.response);
                break;
            case RunnerEnvironmentAction.EXECUTE_ERROR:
                this.executePromises.reject(action.id, action);
                break;
            case RunnerEnvironmentAction.DESTROYED:
                if (!this.destroyPromise) {
                    throw new Error('An action was received about the successful destroy,'
                        + ' but the destroy method was not previously called');
                }
                this.destroyPromise.resolve();
                this.destroyPromise = undefined;
                this.destroy();
                this.onDestroyed();
                break;
            case RunnerEnvironmentAction.DESTROY_ERROR:
                if (!this.destroyPromise) {
                    throw new Error('An action was received about the destroying error,'
                        + ' but the destroy method was not previously called');
                }
                this.destroyPromise.reject(action);
                this.destroyPromise = undefined;
                this.destroy();
                this.onDestroyed();
                break;
        }
    }

    protected sendAction(
        action: IRunnerControllerAction<Exclude<RunnerControllerAction, RunnerControllerAction.INIT>>,
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
        this.port.postMessage(action);
    }

    public destroy(): void {
        const error = new Error(RunnerErrorMessages.RUNNER_NOT_INIT);
        this.executePromises.promises.forEach(promise => {
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
