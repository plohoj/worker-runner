import { WorkerRunnerUnexpectedError } from '@worker-runner/core';
import { ConnectEnvironmentErrorSerializer } from '../../connect/environment/connect-environment-error-serializer';
import { ConnectEnvironment } from '../../connect/environment/connect.environment';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ISerializedError, WorkerRunnerErrorSerializer, WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RunnerDestroyError, RunnerInitError, RunnerNotFound, WorkerDestroyError } from '../../errors/runner-errors';
import { IRunnerControllerConfig, RunnerController } from '../../runner/controller/runner.controller';
import { RunnerEnvironment } from '../../runner/environment/runner.environment';
import { ResolvedRunner } from '../../runner/resolved-runner';
import { RunnerBridgeCollection } from '../../runner/runner-bridge/runner-bridge.collection';
import { IRunnerSerializedParameter, RunnerConstructor } from '../../types/constructor';
import { IRunnerArgument, RunnerArgumentType } from '../../types/runner-argument';
import { IRunnerResolverConfigBase } from '../base-runner.resolver';
import { INodeResolverInitRunnerAction, NodeResolverAction } from '../node/node-resolver.actions';
import { BaseWorkerResolverBridgeFactory, IBaseWorkerResolverBridge, IBaseWorkerResolverBridgeConfig } from '../resolver-bridge/worker/base-worker-resolver.bridge';
import { WorkerResolverBridge } from '../resolver-bridge/worker/worker-resolver.bridge';
import { IWorkerResolverAction, IWorkerResolverRunnerInitedAction, IWorkerResolverRunnerInitErrorAction, WorkerResolverAction } from './worker-resolver.actions';

export interface IBaseWorkerRunnerResolver<R extends RunnerConstructor> extends IRunnerResolverConfigBase<R> {
    bridgeFactory?: BaseWorkerResolverBridgeFactory;
}

export abstract class BaseWorkerRunnerResolver<R extends RunnerConstructor> {
    
    protected runnerEnvironments = new Set<RunnerEnvironment<R>>();
    protected resolverBridge?: IBaseWorkerResolverBridge;
    
    protected readonly runnerBridgeCollection: RunnerBridgeCollection<R>;
    protected readonly RunnerEnvironmentConstructor = RunnerEnvironment; // TODO replace to factory
    protected readonly errorSerializer = this.buildWorkerErrorSerializer();
    protected readonly newConnectionHandler = this.handleNewConnection.bind(this);
    protected readonly connectEnvironment = new ConnectEnvironment({
        destroyErrorSerializer: this.destroyErrorSerializer.bind(this) as ConnectEnvironmentErrorSerializer,
        actionsHandler: this.handleAction.bind(this),
        destroyHandler: this.handleDestroy.bind(this),
    })
    protected readonly bridgeFactory: BaseWorkerResolverBridgeFactory;

    constructor(config: IBaseWorkerRunnerResolver<R>) {
        this.runnerBridgeCollection = new RunnerBridgeCollection(config);
        this.bridgeFactory = config.bridgeFactory || this.defaultBridgeFactory;
    }

    public run(): void {
        this.resolverBridge = this.bridgeFactory({ newConnectionHandler: this.newConnectionHandler });
    }

    public async handleAction(action: INodeResolverInitRunnerAction): Promise<IWorkerResolverAction> {
        switch (action.type) {
            case NodeResolverAction.INIT_RUNNER:
                try {
                    return await this.initRunnerInstance(action);
                } catch (error) {
                    const errorAction: IWorkerResolverRunnerInitErrorAction = {
                        type: WorkerResolverAction.RUNNER_INIT_ERROR,
                        ... this.errorSerializer.serialize(error, new RunnerNotFound({
                            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                                runnerName: this.runnerBridgeCollection.getRunner(action.runnerId).name,
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
        controllers: Array<RunnerController<R>>,
    } {
        const result = {
            args: new Array<IRunnerSerializedParameter>(),
            controllers: new Array<RunnerController<R>>(),
        };
        for (const argument of args) {
            switch (argument.type) {
                case RunnerArgumentType.RUNNER_INSTANCE: {
                    const controller = this.runnerControllerPartFactory({
                        port: argument.port,
                        runnerId: argument.runnerId,
                    });
                    result.controllers.push(controller);
                    result.args.push(controller.resolvedRunner as ResolvedRunner<R>);
                    break;
                }
                default:
                    result.args.push(argument.data);
            }
        }
        return result;
    }

    public async handleDestroy(): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const destroyErrors = new Array<any>();
        const destroying$ = new Array<Promise<void>>();
        for (const runnerEnvironment of this.runnerEnvironments) {
            destroying$.push(
                runnerEnvironment.handleDestroy().catch(error => {
                    destroyErrors.push(this.errorSerializer.serialize(error, new RunnerDestroyError({
                        message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR({
                            runnerName: runnerEnvironment.runnerInstance.constructor.name,
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

    public wrapRunner(runner: InstanceType<R>): MessagePort {
        const messageChanel = new MessageChannel();

        const runnerEnvironment: RunnerEnvironment<R> = new this.RunnerEnvironmentConstructor({
            port: messageChanel.port1,
            runner,
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
        runnerId: number,
        port: MessagePort,
    }): RunnerController<R> {
        const runnerBridgeConstructor = this.runnerBridgeCollection.getRunnerBridgeConstructor(config.runnerId);
        const originalRunnerName = this.runnerBridgeCollection.getRunner(config.runnerId).name;
        return this.runnerControllerFactory({
            ...config,
            runnerBridgeConstructor,
            originalRunnerName,
            runnerControllerPartFactory: this.runnerControllerPartFactory.bind(this),
        });
    }

    protected runnerControllerFactory(config: IRunnerControllerConfig<R>): RunnerController<R> {
        return new RunnerController(config);
    }

    private defaultBridgeFactory(config: IBaseWorkerResolverBridgeConfig): IBaseWorkerResolverBridge {
        return new WorkerResolverBridge(config);
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
        const runnerConstructor = this.runnerBridgeCollection.getRunner(action.runnerId);
        if (!runnerConstructor) {
            throw new RunnerNotFound();
        }
        const messageChanel = new MessageChannel();
        const deserializeArgumentsData = this.deserializeArguments(action.args);
        let runner: InstanceType<R>;
        try {
            runner = new runnerConstructor(...deserializeArgumentsData.args) as InstanceType<R>;
        } catch (error) {
            const errorAction: IWorkerResolverRunnerInitErrorAction = { // TODO throw
                type: WorkerResolverAction.RUNNER_INIT_ERROR,
                ... this.errorSerializer.serialize(error, new RunnerInitError ({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                        runnerName: runnerConstructor.name,
                    }),
                    stack: error?.stack,
                })),
            };
            await Promise.all(deserializeArgumentsData.controllers
                .map(controller => controller.disconnect()));
            return errorAction;
        }

        const runnerEnvironment: RunnerEnvironment<R> = new this.RunnerEnvironmentConstructor({
            port: messageChanel.port1,
            runner,
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
