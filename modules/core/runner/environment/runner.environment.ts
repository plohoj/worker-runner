import { deserializeArguments } from '../../arguments-serialization/deserialize-arguments';
import { ConnectEnvironmentErrorSerializer } from '../../connect/environment/connect-environment-error-serializer';
import { ConnectEnvironment, IConnectEnvironmentConfig } from '../../connect/environment/connect.environment';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ISerializedError, WorkerRunnerErrorSerializer } from '../../errors/error.serializer';
import { ConnectionWasClosedError, RunnerDestroyError, RunnerExecuteError, RunnerNotFound } from '../../errors/runner-errors';
import { IRunnerMethodResult, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { TransferableJsonObject } from '../../types/json-object';
import { RunnerToken, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { IRunnerSerializedArgument } from '../../types/runner-serialized-argument';
import { TransferRunnerData } from '../../utils/transfer-runner-data';
import { IRunnerControllerAction, IRunnerControllerExecuteAction, RunnerControllerAction } from '../controller/runner-controller.actions';
import { IRunnerControllerConfig, RunnerController, RunnerControllerPartFactory } from '../controller/runner.controller';
import { RunnerIdentifierConfigCollection } from '../runner-identifier-config.collection';
import { RunnerBridge, RUNNER_BRIDGE_CONTROLLER } from '../runner.bridge';
import { IRunnerEnvironmentAction, IRunnerEnvironmentOwnDataResponseAction, IRunnerEnvironmentOwnDataResponseErrorAction, IRunnerEnvironmentExecuteResultAction, IRunnerEnvironmentResolvedAction, RunnerEnvironmentAction } from './runner-environment.actions';

interface IRunnerEnvironmentSyncInitConfig<R extends RunnerConstructor> {
    runnerInstance: InstanceType<R>,
}

interface IRunnerEnvironmentAsyncInitConfig {
    arguments: IRunnerSerializedArgument[],
}
export interface IRunnerEnvironmentConfig {
    token: RunnerToken;
    port: MessagePort;
    errorSerializer: WorkerRunnerErrorSerializer;
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    onDestroyed: () => void;
}

export class RunnerEnvironment<R extends RunnerConstructor> {

    public readonly token: RunnerToken;

    protected readonly errorSerializer: WorkerRunnerErrorSerializer;
    protected readonly connectEnvironment: ConnectEnvironment;

    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;

    private _runnerInstance?: InstanceType<R>;
    private onDestroyed: () => void;
    private connectedControllers = new Set<RunnerController<RunnerConstructor>>();
    private readonly runnerControllerPartFactory: RunnerControllerPartFactory<RunnerConstructor>
        = this.initRunnerControllerByPartConfigAndAttachToList.bind(this);

    constructor(config: Readonly<IRunnerEnvironmentConfig>) {
        this.token = config.token;
        this.errorSerializer = config.errorSerializer;
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.onDestroyed = config.onDestroyed;
        this.connectEnvironment = this.buildConnectEnvironment({
            destroyErrorSerializer: this.destroyErrorSerializer.bind(this) as ConnectEnvironmentErrorSerializer,
            actionsHandler: this.handleAction.bind(this),
            destroyHandler: this.handleDestroy.bind(this),
        });
        this.connectEnvironment.addPort(config.port);
    }

    public get runnerInstance(): InstanceType<R> {
        if (!this._runnerInstance) {
            throw new ConnectionWasClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED({
                    token: this.token,
                    runnerName: this.runnerIdentifierConfigCollection.getRunnerConstructorSoft(this.token)?.name,
                }),
            });
        }
        return this._runnerInstance;
    }
    public set runnerInstance(value: InstanceType<R>) {
        this._runnerInstance = value;
    }

    public initSync(config: IRunnerEnvironmentSyncInitConfig<R>): void {
        this.runnerInstance = config.runnerInstance
    }

    public async initAsync(config: IRunnerEnvironmentAsyncInitConfig): Promise<void> {
        let runnerInstance: InstanceType<R>;
        const runnerConstructor = this.runnerIdentifierConfigCollection.getRunnerConstructor(this.token);
        const deserializeArgumentsData = await deserializeArguments({
            arguments: config.arguments,
            runnerControllerPartFactory: this.runnerControllerPartFactory,
        });
        try {
            runnerInstance = new runnerConstructor(...deserializeArgumentsData.arguments) as InstanceType<R>;
        } catch (error) {
            await Promise.all(deserializeArgumentsData.controllers
                .map(controller => controller.disconnect()));
            throw error;
        }
        this.initSync({ runnerInstance });
        this.addConnectedControllers(deserializeArgumentsData.controllers);
    }

    public async execute(
        action: IRunnerControllerExecuteAction,
    ): Promise<IRunnerEnvironmentExecuteResultAction> {
        let response: IRunnerMethodResult;
        const deserializedArgumentsData = await deserializeArguments({
            arguments: action.args,
            runnerControllerPartFactory: this.runnerControllerPartFactory,
        });
        try {
            response = await this.runnerInstance[action.method](...deserializedArgumentsData.arguments);
        } catch (error) {
            await Promise.all(deserializedArgumentsData.controllers
                .map(controller => controller.disconnect()));
            throw error;
        }
        this.addConnectedControllers(deserializedArgumentsData.controllers);
        return await this.handleExecuteResponse(response);
    }

    public addConnectedControllers(controllers: RunnerController<RunnerConstructor>[]): void {
        for (const controller of controllers) {
            this.connectedControllers.add(controller);
        }
    }

    public async handleDestroy(): Promise<void> {
        try {
            if (this.runnerInstance.destroy) {
                await (this.runnerInstance.destroy as () => void | Promise<void>)();
            }
        } finally {
            await Promise.all(
                [...this.connectedControllers]
                    .map(controller => controller
                        .destroy()
                        .catch(error => console.error(error)), // TODO need to combine errors
                    ),
            );
            this.connectedControllers.clear();
            this.onDestroyed();
        }
    }

    public get runnerName(): string {
        return this.runnerInstance.constructor.name;
    }

    protected async handleAction(
        action: IRunnerControllerAction,
    ): Promise<IRunnerEnvironmentAction> {
        switch (action.type) {
            case RunnerControllerAction.EXECUTE:
                try {
                    return await this.execute(action);
                } catch (error) {
                    return {
                        type: RunnerEnvironmentAction.EXECUTE_ERROR,
                        ... this.errorSerializer.serialize(error, new RunnerExecuteError({
                            message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR({
                                token: this.token,
                                methodName: action.method,
                                runnerName: this.runnerName,
                            }),
                        })),
                    };
                }
            case RunnerControllerAction.RESOLVE:
                return await this.resolve();
            case RunnerControllerAction.REQUEST_RUNNER_OWN_DATA:
                return this.getRunnerOwnData();
        }
    }

    protected async handleExecuteResponse(
        executeResult: IRunnerMethodResult,
    ): Promise<IRunnerEnvironmentExecuteResultAction> {
        if (RunnerBridge.isRunnerBridge(executeResult)) {
            const runnerController = executeResult[RUNNER_BRIDGE_CONTROLLER];
            const transferPort: MessagePort = await runnerController.resolveOrTransferControl();
            return {
                type: RunnerEnvironmentAction.EXECUTED_WITH_RUNNER_RESULT,
                port: transferPort,
                token: runnerController.token,
                transfer: [transferPort],
            };
        } else {
            let response: IRunnerSerializedMethodResult;
            const transfer: Transferable[] = [];
            if (executeResult instanceof TransferRunnerData) {
                transfer.push(...executeResult.transfer);
                response = executeResult.data;
            } else {
                response = executeResult;
            }
            return {
                type: RunnerEnvironmentAction.EXECUTED,
                response: response as TransferableJsonObject,
                transfer,
            };
        }
    }

    protected buildConnectEnvironment(config: IConnectEnvironmentConfig): ConnectEnvironment {
        return new ConnectEnvironment(config);
    }

    protected buildRunnerController(
        config: IRunnerControllerConfig<RunnerConstructor>
    ): RunnerController<RunnerConstructor> {
        return new RunnerController(config);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private destroyErrorSerializer(error: any): ISerializedError {
        return this.errorSerializer.serialize(error, new RunnerDestroyError({
            message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR({
                token: this.token,
                runnerName: this.runnerName,
            }),
        }));
    }

    private async resolve(): Promise<IRunnerEnvironmentResolvedAction> {
        const messageChanel = new MessageChannel();
        this.connectEnvironment.addPort(messageChanel.port1);
        return {
            type: RunnerEnvironmentAction.RESOLVED,
            port: messageChanel.port2,
            transfer: [messageChanel.port2]
        };
    }

    private getRunnerOwnData(): IRunnerEnvironmentOwnDataResponseAction | IRunnerEnvironmentOwnDataResponseErrorAction {
        let responseAction: IRunnerEnvironmentOwnDataResponseAction;
        try {
            responseAction = {
                type: RunnerEnvironmentAction.RUNNER_OWN_DATA_RESPONSE,
                methodsNames: this.runnerIdentifierConfigCollection.getRunnerMethodsNames(this.token),
            };
        } catch (error) { // TODO Need test
            const responseErrorAction: IRunnerEnvironmentOwnDataResponseErrorAction = {
                type: RunnerEnvironmentAction.RUNNER_OWN_DATA_RESPONSE_ERROR,
                ... this.errorSerializer.serialize(error, new RunnerNotFound({
                    message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({
                        token: this.token,
                        runnerName: this.runnerIdentifierConfigCollection.getRunnerConstructorSoft(this.token)?.name,
                    }),
                })),
            };
            return responseErrorAction;
        }
        return responseAction;
    }

    private buildRunnerControllerByPartConfig(config: {
        token: RunnerToken,
        port: MessagePort,
    }): RunnerController<RunnerConstructor> {
        const runnerController = this.buildRunnerController({
            ...config,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            runnerControllerPartFactory: this.runnerControllerPartFactory,
            errorSerializer: this.errorSerializer,
            onDestroyed: () => this.connectedControllers.delete(runnerController),
        });
        return runnerController;
    }

    private async initRunnerControllerByPartConfigAndAttachToList(config: {
        token: RunnerToken,
        port: MessagePort,
    }): Promise<RunnerController<RunnerConstructor>> {
        const runnerController = this.buildRunnerControllerByPartConfig(config);
        await runnerController.initAsync();
        this.connectedControllers.add(runnerController);
        return runnerController;
    }
}
