import { INodeResolverWorkerDestroyAction, NodeResolverAction } from '../actions/node-resolver.actions';
import { IRunnerControllerInitAction, RunnerControllerAction } from '../actions/runner-controller.actions';
import { IRunnerEnvironmentInitedAction, IRunnerEnvironmentInitErrorAction, RunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { IWorkerResolverAction, WorkerResolverAction } from '../actions/worker-resolver.actions';
import { extractError } from '../errors/extract-error';
import { RunnerErrorCode, RunnerErrorMessages } from '../errors/runners-errors';
import { RunnerEnvironment } from '../runner/runner.environment';
import { IRunnerConstructorParameter, RunnerConstructor } from '../types/constructor';
import { IRunnerArgument, RunnerArgumentType } from '../types/runner-argument';
import { IRunnerResolverConfigBase } from './base-runner.resolver';

export abstract class WorkerRunnerResolverBase<R extends RunnerConstructor> {
    protected runnerEnvironments = new Set<RunnerEnvironment<R>>();

    constructor(protected config: IRunnerResolverConfigBase<R>) {}

    public run(): void {
        self.addEventListener('message', this.onMessage.bind(this));
        this.sendAction({type: WorkerResolverAction.INIT});
    }

    private onMessage(message: MessageEvent): void {
        this.handleAction(message.data);
    }

    public handleAction(action: INodeResolverWorkerDestroyAction | IRunnerControllerInitAction): void {
        switch (action.type) {
            case RunnerControllerAction.INIT:
                this.initRunnerInstance(action);
                break;
            case NodeResolverAction.DESTROY:
                this.destroyWorker(action.force);
                break;
        }
    }
  private initRunnerInstance(action: IRunnerControllerInitAction): void {
        const runnerConstructor = this.config.runners[action.runnerId];
        if (runnerConstructor) {
            let runnerEnvironment: RunnerEnvironment<R>;
            const messageChanel = new MessageChannel();
            try {
                runnerEnvironment = this.buildRunnerEnvironment(
                    action,
                    messageChanel.port1,
                    runnerConstructor,
                );
            } catch (error) {
                this.sendAction({
                    type: RunnerEnvironmentAction.INIT_ERROR,
                    id: action.id,
                    errorCode: RunnerErrorCode.RUNNER_INIT_ERROR,
                    ...extractError(error),
                });
                return;
            }
            this.runnerEnvironments.add(runnerEnvironment);
            this.sendAction(
                {
                    type: RunnerEnvironmentAction.INITED,
                    id: action.id,
                    port: messageChanel.port2,
                },
                [messageChanel.port2],
            );
        } else {
            this.sendAction({
                type: RunnerEnvironmentAction.INIT_ERROR,
                id: action.id,
                errorCode: RunnerErrorCode.RUNNER_INIT_ERROR,
                error: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
            });
        }
    }

    protected buildRunnerEnvironment(
            action: IRunnerControllerInitAction,
            port: MessagePort,
            runnerConstructor: R,
        ): RunnerEnvironment<R> {
        const runnerEnvironment: RunnerEnvironment<R> = new RunnerEnvironment({
            port,
            runnerConstructor,
            runnerArguments: this.deserializeArguments(action.args),
            workerRunnerResolver: this,
            onDestroyed: () => this.runnerEnvironments.delete(runnerEnvironment),
        });
        return runnerEnvironment;
    }

    public deserializeArguments(args: IRunnerArgument[]): Array<IRunnerConstructorParameter> {
        return args.map(argument => {
            switch (argument.type) {
                case RunnerArgumentType.RUNNER_INSTANCE:
                    throw Error('TODO');
                    // const instance = this.runnerEnvironments.get(argument.instanceId);
                    // if (!instance) {
                    //     throw new Error(RunnerErrorMessages.INSTANCE_NOT_FOUND);
                    // }
                    // return instance.runnerInstance;
                default:
                    return argument.data;
            }
        });
    }

    public async destroyWorker(force = false): Promise<void> {
        if (!force) {
            const destroying$ = new Array<Promise<void>>();
            this.runnerEnvironments.forEach((runnerEnvironment) => {
                destroying$.push(runnerEnvironment.destroy());
            });
            await Promise.all(destroying$);
        }
        this.runnerEnvironments.clear();
        this.sendAction({ type: WorkerResolverAction.DESTROYED });
    }

    public sendAction(
        action: IWorkerResolverAction | IRunnerEnvironmentInitedAction | IRunnerEnvironmentInitErrorAction,
        transfer?: Transferable[],
    ): void {
        // @ts-ignore
        postMessage(action, transfer);
    }
}
