import { deserializeArguments } from '../../arguments-serialization/deserialize-arguments';
import { IConnectCustomAction } from '../../connect/client/connect.client.actions';
import { ConnectHost, IConnectHostConfig } from '../../connect/host/connect.host';
import { IRunnerMessageConfig, WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { WorkerRunnerErrorSerializer } from '../../errors/error.serializer';
import { ConnectionWasClosedError, RunnerDestroyError, RunnerExecuteError, RunnerInitError, RunnerNotFound } from '../../errors/runner-errors';
import { RunnerIdentifierConfigCollection } from '../../runner/runner-identifier-config.collection';
import { RunnerController, RUNNER_ENVIRONMENT_CLIENT } from '../../runner/runner.controller';
import { IRunnerMethodResult, IRunnerSerializedMethodResult, RunnerConstructor } from '../../types/constructor';
import { TransferableJsonLike } from '../../types/json-like';
import { RunnerToken, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { IRunnerSerializedArgument } from '../../types/runner-serialized-argument';
import { allPromisesCollectErrors } from '../../utils/all-promises-collect-errors';
import { TransferRunnerData } from '../../utils/transfer-runner-data';
import { IRunnerEnvironmentClientAction, IRunnerEnvironmentClientExecuteAction, RunnerEnvironmentClientAction } from '../client/runner-environment.client.actions';
import { IRunnerEnvironmentClientCollectionConfig, RunnerEnvironmentClientCollection } from '../client/runner-environment.client.collection';
import { IRunnerEnvironmentHostAction, IRunnerEnvironmentHostOwnDataAction, IRunnerEnvironmentHostExecuteResultAction, IRunnerEnvironmentHostResolvedAction, RunnerEnvironmentHostAction } from './runner-environment.host.actions';

interface IRunnerEnvironmentHostSyncInitConfig<R extends RunnerConstructor> {
    runnerInstance: InstanceType<R>,
}

interface IRunnerEnvironmentHostAsyncInitConfig {
    arguments: IRunnerSerializedArgument[],
}
export interface IRunnerEnvironmentHostConfig {
    token: RunnerToken;
    port: MessagePort;
    errorSerializer: WorkerRunnerErrorSerializer;
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    onDestroyed: () => void;
}

export class RunnerEnvironmentHost<R extends RunnerConstructor> {

    public readonly token: RunnerToken;

    protected readonly errorSerializer: WorkerRunnerErrorSerializer;
    protected readonly connectHost: ConnectHost<IRunnerEnvironmentClientAction, IRunnerEnvironmentHostAction>;

    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    private readonly runnerEnvironmentClientCollection: RunnerEnvironmentClientCollection<RunnerIdentifierConfigList>;
    private readonly onDestroyed: () => void;

    private _runnerInstance?: InstanceType<R>;

    constructor(config: Readonly<IRunnerEnvironmentHostConfig>) {
        this.token = config.token;
        this.errorSerializer = config.errorSerializer;
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.runnerEnvironmentClientCollection = this.buildRunnerEnvironmentClientCollection({
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

    public initSync(config: IRunnerEnvironmentHostSyncInitConfig<R>): void {
        this.runnerInstance = config.runnerInstance
    }

    public async initAsync(config: IRunnerEnvironmentHostAsyncInitConfig): Promise<void> {
        let runnerInstance: InstanceType<R>;
        const runnerConstructor = this.runnerIdentifierConfigCollection.getRunnerConstructor(this.token);
        const deserializedArgumentsData = await deserializeArguments({
            arguments: config.arguments,
            runnerEnvironmentClientPartFactory: this.runnerEnvironmentClientCollection.runnerEnvironmentClientPartFactory,
            combinedErrorsFactory: (errors: unknown[]) => new RunnerInitError({
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR(this.getErrorMessageConfig()),
                originalErrors: errors,
            }),
        });
        this.runnerEnvironmentClientCollection.add(...deserializedArgumentsData.controllers);
        try {
            runnerInstance = new runnerConstructor(...deserializedArgumentsData.arguments) as InstanceType<R>;
        } catch (error) {
            const possibleErrors = await allPromisesCollectErrors(
                deserializedArgumentsData.controllers
                    .map(controller => controller.disconnect())
            );
            // TODO NEED TEST About delete controller if ResolvedRunner was disconnected / destroyed in constructor 
            this.runnerEnvironmentClientCollection.delete(...deserializedArgumentsData.controllers);
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
        action: IRunnerEnvironmentClientExecuteAction,
    ): Promise<IRunnerEnvironmentHostExecuteResultAction> {
        let response: IRunnerMethodResult;
        const deserializedArgumentsData = await deserializeArguments({
            arguments: action.args,
            runnerEnvironmentClientPartFactory: this.runnerEnvironmentClientCollection.runnerEnvironmentClientPartFactory,
            combinedErrorsFactory: (errors: unknown[]) => new RunnerExecuteError({
                message: WORKER_RUNNER_ERROR_MESSAGES.EXECUTE_ERROR(this.getErrorMessageConfig()),
                originalErrors: errors,
            }),
        });
        this.runnerEnvironmentClientCollection.add(...deserializedArgumentsData.controllers);
        try {
            response = await this.runnerInstance[action.method](...deserializedArgumentsData.arguments);
        } catch (error: unknown) {
            const possibleErrors = await allPromisesCollectErrors(
                deserializedArgumentsData.controllers
                    .map(controller => controller.disconnect())
            );
            // TODO NEED TEST About delete controller if ResolvedRunner was disconnected / destroyed in executed method 
            this.runnerEnvironmentClientCollection.delete(...deserializedArgumentsData.controllers);
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
            [...this.runnerEnvironmentClientCollection.runnerEnvironmentClients]
                .map(controller => controller.disconnect()),
        );
        this.runnerEnvironmentClientCollection.runnerEnvironmentClients.clear();
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
        action: IRunnerEnvironmentClientAction,
    ): Promise<IRunnerEnvironmentHostAction> {
        switch (action.type) {
            case RunnerEnvironmentClientAction.EXECUTE:
                return await this.execute(action);
            case RunnerEnvironmentClientAction.RESOLVE:
                return await this.resolve();
            case RunnerEnvironmentClientAction.REQUEST_RUNNER_OWN_DATA:
                return this.getRunnerOwnData();
        }
    }

    protected async handleExecuteResponse(
        executeResult: IRunnerMethodResult,
    ): Promise<IRunnerEnvironmentHostExecuteResultAction> {
        if (RunnerController.isRunnerController(executeResult)) {
            const runnerEnvironmentClient = executeResult[RUNNER_ENVIRONMENT_CLIENT];
            const transferPort: MessagePort = await runnerEnvironmentClient.resolveOrTransferControl();
            return {
                type: RunnerEnvironmentHostAction.EXECUTED_WITH_RUNNER_RESULT,
                port: transferPort,
                token: runnerEnvironmentClient.token,
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
                type: RunnerEnvironmentHostAction.EXECUTED,
                response: response as TransferableJsonLike,
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

    protected buildRunnerEnvironmentClientCollection(
        config: IRunnerEnvironmentClientCollectionConfig<RunnerIdentifierConfigList>
    ): RunnerEnvironmentClientCollection<RunnerIdentifierConfigList> {
        return new RunnerEnvironmentClientCollection(config);
    }

    private async resolve(): Promise<IRunnerEnvironmentHostResolvedAction> {
        const messageChanel = new MessageChannel();
        this.connectHost.addPort(messageChanel.port1);
        return {
            type: RunnerEnvironmentHostAction.RESOLVED,
            port: messageChanel.port2,
            transfer: [messageChanel.port2]
        };
    }

    private getRunnerOwnData(): IRunnerEnvironmentHostOwnDataAction {
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
        const responseAction: IRunnerEnvironmentHostOwnDataAction = {
            type: RunnerEnvironmentHostAction.RUNNER_OWN_DATA,
            methodsNames,
        };
        return responseAction;
    }
}
