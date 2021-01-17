import { WorkerRunnerUnexpectedError } from '@worker-runner/core';
import { ConnectEnvironmentErrorSerializer } from '../../connect/environment/connect-environment-error-serializer';
import { ConnectEnvironment } from '../../connect/environment/connect.environment';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ISerializedError, WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RunnerDestroyError, RunnerInitError, RunnerNotFound, WorkerDestroyError } from '../../errors/runner-errors';
import { IRunnerControllerConfig, RunnerController } from '../../runner/controller/runner.controller';
import { RunnerEnvironment } from '../../runner/environment/runner.environment';
import { ResolvedRunner } from '../../runner/resolved-runner';
import { AnyRunnerFromList, RunnersList, RunnersListController, RunnerToken } from '../../runner/runner-bridge/runners-list.controller';
import { IRunnerSerializedParameter } from '../../types/constructor';
import { RunnerResolverPossibleConnection } from '../../types/possible-connection';
import { IRunnerArgument, RunnerArgumentType } from '../../types/runner-argument';
import { IRunnerResolverConfigBase } from '../base-runner.resolver';
import { INodeResolverInitRunnerAction, NodeResolverAction } from '../node/node-resolver.actions';
import { WorkerResolverBridge } from '../resolver-bridge/worker/worker-resolver.bridge';
import { IWorkerResolverAction, IWorkerResolverRunnerInitedAction, IWorkerResolverRunnerInitErrorAction, WorkerResolverAction } from './worker-resolver.actions';

export interface IBaseWorkerRunnerResolver<L extends RunnersList> extends IRunnerResolverConfigBase<L> {
    connections?: RunnerResolverPossibleConnection[];
}

export abstract class BaseWorkerRunnerResolver<L extends RunnersList> {
    
    protected runnerEnvironments = new Set<RunnerEnvironment<AnyRunnerFromList<L>>>();
    protected resolverBridge: WorkerResolverBridge;
    
    protected readonly runnersListController: RunnersListController<L>;
    protected readonly RunnerEnvironmentConstructor = RunnerEnvironment; // TODO replace to factory
    protected readonly errorSerializer = this.buildWorkerErrorSerializer();
    protected readonly newConnectionHandler = this.handleNewConnection.bind(this);
    protected readonly connectEnvironment = new ConnectEnvironment({
        destroyErrorSerializer: this.destroyErrorSerializer.bind(this) as ConnectEnvironmentErrorSerializer,
        actionsHandler: this.handleAction.bind(this),
        destroyHandler: this.onAllDisconnect.bind(this),
    });

    constructor(config: IBaseWorkerRunnerResolver<L>) {
        this.runnersListController = new RunnersListController(config);
        this.resolverBridge = new WorkerResolverBridge({
            newConnectionHandler: this.newConnectionHandler,
            connections: config.connections
                ? config.connections.slice()
                : [self],
        });
    }

    public run(): void {
        this.resolverBridge.run();
    }

    public addConnections(connections: RunnerResolverPossibleConnection[]): void {
        this.resolverBridge.addConnections(connections);
    }

    public removeConnections(connections: RunnerResolverPossibleConnection[]): void {
        this.resolverBridge.removeConnections(connections);
    }

    public async handleAction(action: INodeResolverInitRunnerAction): Promise<IWorkerResolverAction> {
        switch (action.type) {
            case NodeResolverAction.INIT_RUNNER:
                try {
                    return await this.initRunnerInstance(action);
                } catch (error) {
                    let runnerName: string | undefined;
                    try {
                        runnerName = this.runnersListController.getRunner(action.token).name;
                    } catch { /** Only try get name */ }
                    const errorAction: IWorkerResolverRunnerInitErrorAction = {
                        type: WorkerResolverAction.RUNNER_INIT_ERROR,
                        ... this.errorSerializer.serialize(error, new RunnerNotFound({
                            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                                token: action.token,
                                runnerName,
                            }),
                            stack: error?.stack,
                        })),
                    };
                    return errorAction;
                }
            default:
                throw new WorkerRunnerUnexpectedError({
                    message: 'Unexpected Action type for Worker Runner Resolver',
                });
        }
    }

    public deserializeArguments(args: IRunnerArgument[]): {
        args: Array<IRunnerSerializedParameter>,
        controllers: Array<RunnerController<AnyRunnerFromList<L>>>,
    } {
        const result = {
            args: new Array<IRunnerSerializedParameter>(),
            controllers: new Array<RunnerController<AnyRunnerFromList<L>>>(),
        };
        for (const argument of args) {
            switch (argument.type) {
                case RunnerArgumentType.RUNNER_INSTANCE: {
                    const controller = this.runnerControllerPartFactory({
                        port: argument.port,
                        token: argument.token,
                    });
                    result.controllers.push(controller);
                    result.args.push(controller.resolvedRunner as ResolvedRunner<AnyRunnerFromList<L>>);
                    break;
                }
                default:
                    result.args.push(argument.data);
            }
        }
        return result;
    }

    public async destroy(): Promise<void> {
        if (!this.resolverBridge.isRunning) {
            throw new WorkerRunnerUnexpectedError({
                message: 'Resolver Worker Runner was caused to be destroyed but did not start previously.',
            });
        }
        await this.clearEnvironment();
        this.resolverBridge.destroy();
    }

    public wrapRunner(runner: InstanceType<AnyRunnerFromList<L>>): MessagePort {
        const messageChanel = new MessageChannel();

        const runnerEnvironment: RunnerEnvironment<AnyRunnerFromList<L>> = new this.RunnerEnvironmentConstructor({
            token: this.runnersListController.getRunnerTokenByInstance(runner),
            runner,
            port: messageChanel.port1,
            workerRunnerResolver: this,
            errorSerializer: this.errorSerializer,
            onDestroyed: () => this.runnerEnvironments.delete(runnerEnvironment),
        });

        this.runnerEnvironments.add(runnerEnvironment);
        return messageChanel.port2;
    }

    protected buildWorkerErrorSerializer(): WorkerRunnerErrorSerializer {
        return WORKER_RUNNER_ERROR_SERIALIZER;
    }

    protected runnerControllerPartFactory(config: {
        token: RunnerToken,
        port: MessagePort,
    }): RunnerController<AnyRunnerFromList<L>> {
        const runnerBridgeConstructor = this.runnersListController.getRunnerBridgeConstructor(config.token);
        const originalRunnerName = this.runnersListController.getRunner(config.token).name;
        return this.runnerControllerFactory({
            ...config,
            runnerBridgeConstructor,
            originalRunnerName,
            runnerControllerPartFactory: this.runnerControllerPartFactory.bind(this),
        });
    }

    protected runnerControllerFactory(
        config: IRunnerControllerConfig<AnyRunnerFromList<L>>
    ): RunnerController<AnyRunnerFromList<L>> {
        return new RunnerController(config);
    }

    private async onAllDisconnect(): Promise<void> {
        await this.clearEnvironment();
    }

    private async clearEnvironment(): Promise<void> {
        const destroyErrors = new Array<ISerializedError>();
        const destroying$ = new Array<Promise<void>>();
        for (const runnerEnvironment of this.runnerEnvironments) {
            destroying$.push(
                runnerEnvironment.handleDestroy().catch(error => {
                    destroyErrors.push(this.errorSerializer.serialize(error, new RunnerDestroyError({
                        message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR({
                            token: runnerEnvironment.token,
                            runnerName: runnerEnvironment.runnerName,
                        }),
                        stack: error?.stack,
                    })));
                }),
            );
        }
        await Promise.all(destroying$);
        this.runnerEnvironments.clear();
        if (destroyErrors.length > 0) {
            throw new WorkerDestroyError({ // TODO need test
                originalErrors: destroyErrors,
            });
        }
    }
    private handleNewConnection(port: MessagePort): void {
        this.connectEnvironment.addPort(port);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private destroyErrorSerializer(error: any): ISerializedError {
        return this.errorSerializer.serialize(error, new WorkerDestroyError({
            stack: error?.stack,
        }));
    }
    
    private async initRunnerInstance(
        action: INodeResolverInitRunnerAction,
    ): Promise<IWorkerResolverRunnerInitErrorAction | IWorkerResolverRunnerInitedAction> {
        const runnerConstructor = this.runnersListController.getRunner(action.token);
        const messageChanel = new MessageChannel();
        const deserializeArgumentsData = this.deserializeArguments(action.args);
        let runner: InstanceType<AnyRunnerFromList<L>>;
        try {
            runner = new runnerConstructor(...deserializeArgumentsData.args) as InstanceType<AnyRunnerFromList<L>>;
        } catch (error) {
            const errorAction: IWorkerResolverRunnerInitErrorAction = { // TODO throw
                type: WorkerResolverAction.RUNNER_INIT_ERROR,
                ... this.errorSerializer.serialize(error, new RunnerInitError ({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                        token: action.token,
                        runnerName: runnerConstructor.name,
                    }),
                    stack: error?.stack,
                })),
            };
            await Promise.all(deserializeArgumentsData.controllers
                .map(controller => controller.disconnect()));
            return errorAction;
        }

        const runnerEnvironment: RunnerEnvironment<AnyRunnerFromList<L>> = new this.RunnerEnvironmentConstructor({
            token: action.token,
            runner,
            port: messageChanel.port1,
            workerRunnerResolver: this,
            errorSerializer: this.errorSerializer,
            onDestroyed: () => this.runnerEnvironments.delete(runnerEnvironment),
        });

        this.runnerEnvironments.add(runnerEnvironment);
        runnerEnvironment.addConnectedControllers(deserializeArgumentsData.controllers);
        const responseAction: IWorkerResolverRunnerInitedAction = {
            type: WorkerResolverAction.RUNNER_INITED,
            port: messageChanel.port2,
            transfer: [messageChanel.port2],
        };
        return responseAction;
    }
}
