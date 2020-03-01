import { INodeResolverWorkerDestroyAction, NodeResolverAction } from '../actions/node-resolver.actions';
import { IRunnerControllerInitAction, RunnerControllerAction } from '../actions/runner-controller.actions';
import { IRunnerEnvironmentInitedAction, IRunnerEnvironmentInitErrorAction, RunnerEnvironmentAction } from '../actions/runner-environment.actions';
import { IWorkerResolverAction, WorkerResolverAction } from '../actions/worker-resolver.actions';
import { extractError } from '../errors/extract-error';
import { RunnerErrorCode, RunnerErrorMessages } from '../errors/runners-errors';
import { resolveRunnerBridgeConstructor } from '../runner/bridge-constructor.resolver';
import { ResolveRunner } from '../runner/resolved-runner';
import { IRunnerBridgeConstructor } from '../runner/runner-bridge';
import { RunnerController } from '../runner/runner.controller';
import { RunnerEnvironment } from '../runner/runner.environment';
import { IRunnerSerializedParameter, RunnerConstructor } from '../types/constructor';
import { IRunnerArgument, RunnerArgumentType } from '../types/runner-argument';
import { IRunnerResolverConfigBase } from './base-runner.resolver';

export abstract class WorkerRunnerResolverBase<R extends RunnerConstructor> {
    protected runnerEnvironments = new Set<RunnerEnvironment<R>>();
    protected runnerBridgeConstructors = new Array<IRunnerBridgeConstructor<R>>();
    protected RunnerEnvironmentConstructor = RunnerEnvironment;

    constructor(protected config: IRunnerResolverConfigBase<R>) {
        this.runnerBridgeConstructors = this.config.runners.map(runner => resolveRunnerBridgeConstructor(runner));
    }

    public run(): void {
        self.addEventListener('message', this.onMessage.bind(this));
        this.sendAction({type: WorkerResolverAction.INIT});
    }

    public onMessage(message: MessageEvent): void {
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
    private async initRunnerInstance(action: IRunnerControllerInitAction): Promise<void> {
        const runnerConstructor = this.config.runners[action.runnerId];
        if (runnerConstructor) {
            const messageChanel = new MessageChannel();
            const deserializeArgumentsData = this.deserializeArguments(action.args);
            let runner: InstanceType<R>;
            try {
                runner = new runnerConstructor(...deserializeArgumentsData.args) as InstanceType<R>;
            } catch (error) {
                this.sendAction({
                    type: RunnerEnvironmentAction.INIT_ERROR,
                    id: action.id,
                    errorCode: RunnerErrorCode.RUNNER_INIT_ERROR,
                    ...extractError(error),
                });
                await Promise.all(deserializeArgumentsData.controllers
                    .map(controller => controller.disconnect()));
                return;
            }

            const runnerEnvironment: RunnerEnvironment<R> = new this.RunnerEnvironmentConstructor({
                port: messageChanel.port1,
                runnerId: action.runnerId,
                runner,
                workerRunnerResolver: this,
                onDestroyed: () => this.runnerEnvironments.delete(runnerEnvironment),
            });

            this.runnerEnvironments.add(runnerEnvironment);
            runnerEnvironment.addConnectedControllers(deserializeArgumentsData.controllers);
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

    public deserializeArguments(args: IRunnerArgument[]): {
        args: Array<IRunnerSerializedParameter>,
        controllers: Array<RunnerController<R>>,
    } {
        const result = {
            args: new Array<IRunnerSerializedParameter>(),
            controllers: new Array<RunnerController<R>>(),
        };
        for (const argument of args) {
            switch (argument.type) {
                case RunnerArgumentType.RUNNER_INSTANCE:
                    const controller = new RunnerController({
                        bridgeConstructor: this.runnerBridgeConstructors[argument.runnerId],
                        runnerBridgeConstructors: this.runnerBridgeConstructors,
                        port: argument.port,
                    });
                    result.controllers.push(controller);
                    result.args.push(controller.resolvedRunner as ResolveRunner<R>);
                    break;
                default:
                    result.args.push(argument.data);
            }
        }
        return result;
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

    public wrapRunner(runnerId: number, runner: InstanceType<R>): MessagePort {
        const messageChanel = new MessageChannel();

        const runnerEnvironment: RunnerEnvironment<R> = new this.RunnerEnvironmentConstructor({
            port: messageChanel.port1,
            runnerId,
            runner,
            workerRunnerResolver: this,
            onDestroyed: () => this.runnerEnvironments.delete(runnerEnvironment),
        });

        this.runnerEnvironments.add(runnerEnvironment);
        return messageChanel.port2;
    }
}
