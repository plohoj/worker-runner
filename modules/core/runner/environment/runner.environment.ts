import { deserializeArguments } from '../../arguments-serialization/deserialize-arguments';
import { IConnectCustomAction } from '../../connect/client/connect-client.actions';
import { ConnectHost, IConnectHostConfig } from '../../connect/host/connect.host';
import { IRunnerMessageConfig, WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { WorkerRunnerErrorSerializer } from '../../errors/error.serializer';
import { ConnectionWasClosedError, RunnerDestroyError, RunnerExecuteError, RunnerInitError, RunnerNotFound } from '../../errors/runner-errors';
import { IRunnerMethodResult, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { TransferableJsonObject } from '../../types/json-object';
import { RunnerToken, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { IRunnerSerializedArgument } from '../../types/runner-serialized-argument';
import { allPromisesCollectErrors } from '../../utils/all-promises-collect-errors';
import { TransferRunnerData } from '../../utils/transfer-runner-data';
import { IRunnerControllerAction, IRunnerControllerExecuteAction, RunnerControllerAction } from '../controller/runner-controller.actions';
import { IRunnerControllerCollectionConfig, RunnerControllerCollection } from '../controller/runner.controller.collection';
import { RunnerIdentifierConfigCollection } from '../runner-identifier-config.collection';
import { RunnerBridge, RUNNER_BRIDGE_CONTROLLER } from '../runner.bridge';
import { IRunnerEnvironmentAction, IRunnerEnvironmentOwnDataAction, IRunnerEnvironmentExecuteResultAction, IRunnerEnvironmentResolvedAction, RunnerEnvironmentAction } from './runner-environment.actions';

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
    protected readonly connectHost: ConnectHost<IRunnerControllerAction, IRunnerEnvironmentAction>;

    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    private readonly runnerControllerCollection: RunnerControllerCollection<RunnerIdentifierConfigList>;
    private readonly onDestroyed: () => void;

    private _runnerInstance?: InstanceType<R>;

    constructor(config: Readonly<IRunnerEnvironmentConfig>) {
        this.token = config.token;
        this.errorSerializer = config.errorSerializer;
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.runnerControllerCollection = this.buildRunnerControllerCollection({
            errorSerializer: this.errorSerializer,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
        });
        this.onDestroyed = config.onDestroyed;
        this.connectHost = this.buildConnectHost({
            errorSerializer: this.errorSerializer,
            actionsHandler: this.handleAction.bind(this),
            destroyHandler: this.handleDestroy.bind(this),
        });
        this.connectHost.addPort(config.port);
    }

    public get runnerInstance(): InstanceType<R> {
        if (!this._runnerInstance) {
            throw new ConnectionWasClosedError({
                message: WORKER_RUNNER_ERROR_MESSAGES.CONNECTION_WAS_CLOSED(
                    this.getErrorMessageConfig(),
                ),
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
        const deserializedArgumentsData = await deserializeArguments({
            arguments: config.arguments,
            runnerControllerPartFactory: this.runnerControllerCollection.runnerControllerPartFactory,
            combinedErrorsFactory: (errors: unknown[]) => new RunnerInitError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR(this.getErrorMessageConfig()),
                originalErrors: errors,
            }),
        });
        this.runnerControllerCollection.add(...deserializedArgumentsData.controllers);
        try {
            runnerInstance = new runnerConstructor(...deserializedArgumentsData.arguments) as InstanceType<R>;
        } catch (error) {
            const possibleErrors = await allPromisesCollectErrors(
                deserializedArgumentsData.controllers
                    .map(controller => controller.disconnect())
            );
            // TODO NEED TEST About delete controller if ResolvedRunner was disconnected / destroyed in constructor 
            this.runnerControllerCollection.delete(...deserializedArgumentsData.controllers);
            if ('errors' in possibleErrors) {
                throw new RunnerInitError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR(
                        this.getErrorMessageConfig(),
                    ),
                    originalErrors: [
                        error,
                        ...possibleErrors.errors,
                    ]
                })
            }
            throw error;
        }
        this.initSync({ runnerInstance });
    }

    public async execute(
        action: IRunnerControllerExecuteAction,
    ): Promise<IRunnerEnvironmentExecuteResultAction> {
        let response: IRunnerMethodResult;
        const deserializedArgumentsData = await deserializeArguments({
            arguments: action.args,
            runnerControllerPartFactory: this.runnerControllerCollection.runnerControllerPartFactory,
            combinedErrorsFactory: (errors: unknown[]) => new RunnerExecuteError({
                message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR(this.getErrorMessageConfig()),
                originalErrors: errors,
            }),
        });
        this.runnerControllerCollection.add(...deserializedArgumentsData.controllers);
        try {
            response = await this.runnerInstance[action.method](...deserializedArgumentsData.arguments);
        } catch (error: unknown) {
            const possibleErrors = await allPromisesCollectErrors(
                deserializedArgumentsData.controllers
                    .map(controller => controller.disconnect())
            );
            // TODO NEED TEST About delete controller if ResolvedRunner was disconnected / destroyed in executed method 
            this.runnerControllerCollection.delete(...deserializedArgumentsData.controllers);
            if ('errors' in possibleErrors) {
                throw new RunnerExecuteError({
                    message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR(
                        this.getErrorMessageConfig(),
                    ),
                    originalErrors: [
                        error,
                        ...possibleErrors.errors,
                    ]
                })
            }
            throw this.errorSerializer.normalize(error, RunnerExecuteError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR({
                    ...this.getErrorMessageConfig(),
                    methodName: action.method,
                }),
            });
        }
        return await this.handleExecuteResponse(response);
    }

    public async handleDestroy(): Promise<void> {
        let caughtError: unknown | undefined;
        try {
            if (this.runnerInstance.destroy) {
                await (this.runnerInstance.destroy as () => void | Promise<void>)();
            }
        } catch(error: unknown) {
            caughtError = this.errorSerializer.normalize(error, RunnerDestroyError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(
                    this.getErrorMessageConfig(),
                ),
            }) ;
        }
        const possibleErrors = await allPromisesCollectErrors(
            [...this.runnerControllerCollection.runnerControllers]
                .map(controller => controller.disconnect()),
        );
        this.runnerControllerCollection.runnerControllers.clear();
        this.onDestroyed();
        if ('errors' in possibleErrors) {
            const originalErrors = new Array<unknown>();
            if (caughtError) {
                originalErrors.push(caughtError);
            }
            originalErrors.push(...possibleErrors.errors);
            throw new RunnerDestroyError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_DESTROY_ERROR(
                    this.getErrorMessageConfig(),
                ),
                originalErrors,
            });
        }
        if (caughtError) {
            throw caughtError;
        }
    }

    protected getErrorMessageConfig(): IRunnerMessageConfig {
        return {
            token: this.token,
            runnerName: this._runnerInstance?.constructor.name
                || this.runnerIdentifierConfigCollection.getRunnerConstructorSoft(this.token)?.name,
        }
    }

    protected async handleAction(
        action: IRunnerControllerAction,
    ): Promise<IRunnerEnvironmentAction> {
        switch (action.type) {
            case RunnerControllerAction.EXECUTE:
                return await this.execute(action);
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

    protected buildConnectHost<
        I extends IConnectCustomAction,
        O extends IConnectCustomAction
    >(config: IConnectHostConfig<I, O>): ConnectHost<I, O> {
        return new ConnectHost(config);
    }

    protected buildRunnerControllerCollection(
        config: IRunnerControllerCollectionConfig<RunnerIdentifierConfigList>
    ): RunnerControllerCollection<RunnerIdentifierConfigList> {
        return new RunnerControllerCollection(config);
    }

    private async resolve(): Promise<IRunnerEnvironmentResolvedAction> {
        const messageChanel = new MessageChannel();
        this.connectHost.addPort(messageChanel.port1);
        return {
            type: RunnerEnvironmentAction.RESOLVED,
            port: messageChanel.port2,
            transfer: [messageChanel.port2]
        };
    }

    private getRunnerOwnData(): IRunnerEnvironmentOwnDataAction {
        let methodsNames: string[];
        try {
            methodsNames = this.runnerIdentifierConfigCollection.getRunnerMethodsNames(this.token)
        } catch (error) { // TODO NEED TEST
            throw this.errorSerializer.normalize(error, RunnerNotFound, {
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND(
                    this.getErrorMessageConfig(),
                ),
            });
        }
        const responseAction: IRunnerEnvironmentOwnDataAction = {
            type: RunnerEnvironmentAction.RUNNER_OWN_DATA,
            methodsNames,
        };
        return responseAction;
    }
}
