import { INodeResolverAction, INodeResolverInitRunnerAction, NodeResolverAction } from '../actions/node-resolver.actions';
import { IWorkerResolverAction, WorkerResolverAction } from '../actions/worker-resolver.actions';
import { WorkerRunnerErrorCode } from '../errors/error-code';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../errors/error-message';
import { WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../errors/error.serializer';
import { RunnerInitError } from '../errors/runner-errors';
import { resolveRunnerBridgeConstructor } from '../runner/bridge-constructor.resolver';
import { ResolvedRunner } from '../runner/resolved-runner';
import { IRunnerBridgeConstructor } from '../runner/runner-bridge';
import { RunnerController } from '../runner/runner.controller';
import { RunnerEnvironment } from '../runner/runner.environment';
import { IRunnerSerializedParameter, RunnerConstructor } from '../types/constructor';
import { IRunnerArgument, RunnerArgumentType } from '../types/runner-argument';
import { IRunnerResolverConfigBase } from './base-runner.resolver';

export abstract class WorkerRunnerResolverBase<R extends RunnerConstructor> {
    protected runnerEnvironments = new Set<RunnerEnvironment<R>>();
    protected runnerBridgeConstructors = new Array<IRunnerBridgeConstructor<R>>();
    protected readonly RunnerEnvironmentConstructor = RunnerEnvironment;
    protected readonly errorSerializer: WorkerRunnerErrorSerializer = WORKER_RUNNER_ERROR_SERIALIZER;
    protected readonly RunnerControllerConstructor = RunnerController;
    protected readonly runners: ReadonlyArray<R>;

    constructor(config: Readonly<IRunnerResolverConfigBase<R>>) {
        this.runners = config.runners;
        this.runnerBridgeConstructors = this.runners.map(runner => resolveRunnerBridgeConstructor(runner));
    }

    public run(): void {
        self.addEventListener('message', this.onMessage.bind(this));
        this.sendAction({type: WorkerResolverAction.WORKER_INITED});
    }

    public onMessage(message: MessageEvent): void {
        this.handleAction(message.data);
    }

    public async handleAction(action: INodeResolverAction): Promise<void> {
        switch (action.type) {
            case NodeResolverAction.INIT_RUNNER:
                try {
                    await this.initRunnerInstance(action);
                } catch (error) {
                    this.sendAction({
                        id: action.id,
                        type: WorkerResolverAction.RUNNER_INIT_ERROR,
                        ... this.errorSerializer.serialize(error, {
                            errorCode: WorkerRunnerErrorCode.RUNNER_INIT_ERROR,
                            name: RunnerInitError.name,
                            message: WORKER_RUNNER_ERROR_MESSAGES.UNEXPECTED_ERROR(),
                            stack: error?.stack || new Error().stack,
                        }),
                    });
                }
                break;
            case NodeResolverAction.DESTROY:
                try {
                    await this.destroyWorker(action.force);
                } catch (error) {
                    this.sendAction({ type: WorkerResolverAction.DESTROYED });
                }
                break;
        }
    }
    private async initRunnerInstance(action: INodeResolverInitRunnerAction): Promise<void> {
        const runnerConstructor = this.runners[action.runnerId];
        if (runnerConstructor) {
            const messageChanel = new MessageChannel();
            const deserializeArgumentsData = this.deserializeArguments(action.args);
            let runner: InstanceType<R>;
            try {
                runner = new runnerConstructor(...deserializeArgumentsData.args) as InstanceType<R>;
            } catch (error) {
                this.sendAction({
                    id: action.id,
                    type: WorkerResolverAction.RUNNER_INIT_ERROR,
                    ... this.errorSerializer.serialize(error, {
                        errorCode: WorkerRunnerErrorCode.RUNNER_INIT_ERROR,
                        message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                            runnerName: runnerConstructor.name,
                        }),
                        name: RunnerInitError.name,
                        stack: error?.stack || new Error().stack,
                    }),
                });
                await Promise.all(deserializeArgumentsData.controllers
                    .map(controller => controller.disconnect()));
                return;
            }

            const runnerEnvironment: RunnerEnvironment<R> = new this.RunnerEnvironmentConstructor({
                port: messageChanel.port1,
                runner,
                workerRunnerResolver: this,
                onDestroyed: () => this.runnerEnvironments.delete(runnerEnvironment),
            });

            this.runnerEnvironments.add(runnerEnvironment);
            runnerEnvironment.addConnectedControllers(deserializeArgumentsData.controllers);
            this.sendAction(
                {
                    type: WorkerResolverAction.RUNNER_INITED,
                    id: action.id,
                    port: messageChanel.port2,
                },
                [messageChanel.port2],
            );
        } else {
            throw new RunnerInitError();
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
                    const controller = new this.RunnerControllerConstructor({
                        runnerId: argument.runnerId,
                        runnerBridgeConstructors: this.runnerBridgeConstructors,
                        port: argument.port,
                        runners: this.runners,
                    });
                    result.controllers.push(controller);
                    result.args.push(controller.resolvedRunner as ResolvedRunner<R>);
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
        action: IWorkerResolverAction,
        transfer?: Transferable[],
    ): void {
        // @ts-ignore
        postMessage(action, transfer);
    }

    public wrapRunner(runner: InstanceType<R>): MessagePort {
        const messageChanel = new MessageChannel();

        const runnerEnvironment: RunnerEnvironment<R> = new this.RunnerEnvironmentConstructor({
            port: messageChanel.port1,
            runner,
            workerRunnerResolver: this,
            onDestroyed: () => this.runnerEnvironments.delete(runnerEnvironment),
        });

        this.runnerEnvironments.add(runnerEnvironment);
        return messageChanel.port2;
    }
}
