import { ActionController } from '../../action-controller/action-controller';
import { ArgumentsDeserializer } from '../../arguments-serialization/arguments-deserializer';
import { ArgumentsSerializer } from '../../arguments-serialization/arguments-serializer';
import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-message';
import { ErrorSerializer } from "../../errors/error.serializer";
import { RunnerInitError, RunnerResolverHostDestroyError } from '../../errors/runner-errors';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { IRunnerEnvironmentHostConfig, RunnerEnvironmentHost } from '../../runner-environment/host/runner-environment.host';
import { RunnerIdentifierConfigCollection } from "../../runner/runner-identifier-config.collection";
import { IActionWithId } from '../../types/action';
import { RunnerConstructor } from '../../types/constructor';
import { RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { allPromisesCollectErrors } from '../../utils/all-promises-collect-errors';
import { IRunnerResolverClientAction, IRunnerResolverClientInitRunnerAction, IRunnerResolverClientSoftInitRunnerAction, RunnerResolverClientAction } from '../client/runner-resolver.client.actions';
import { IRunnerResolverHostDestroyedAction, IRunnerResolverHostErrorAction, IRunnerResolverHostRunnerInitedAction, IRunnerResolverHostSoftRunnerInitedAction, RunnerResolverHostAction } from './runner-resolver.host.actions';

export interface IConnectedRunnerResolverHostConfig {
    connectionChannel: BaseConnectionChannel;
    connectionStrategy: BaseConnectionStrategyHost,
    runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    errorSerializer: ErrorSerializer,
    argumentSerializer: ArgumentsSerializer;
    argumentDeserializer: ArgumentsDeserializer;
    onDestroy: () => void;
}

export class ConnectedRunnerResolverHost {

    public readonly runnerEnvironmentHosts = new Set<RunnerEnvironmentHost<RunnerConstructor>>();

    private readonly actionController: ActionController;
    private readonly runnerIdentifierConfigCollection: RunnerIdentifierConfigCollection<RunnerIdentifierConfigList>;
    private readonly connectionStrategy: BaseConnectionStrategyHost;
    private readonly errorSerializer: ErrorSerializer;
    private readonly argumentSerializer: ArgumentsSerializer;
    private readonly argumentDeserializer: ArgumentsDeserializer;
    private onDestroy: () => void;

    constructor(config: IConnectedRunnerResolverHostConfig) {
        this.runnerIdentifierConfigCollection = config.runnerIdentifierConfigCollection;
        this.connectionStrategy = config.connectionStrategy;
        this.errorSerializer = config.errorSerializer;
        this.argumentSerializer = config.argumentSerializer;
        this.argumentDeserializer = config.argumentDeserializer;
        this.actionController = new ActionController({connectionChannel: config.connectionChannel});
        this.onDestroy = config.onDestroy;
    }

    public run(): void {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.actionController.addActionHandler(this.handleAction);
        this.actionController.run();
    }

    public async handleDestroy(actionId?: number): Promise<void> {
        try {
            await this.clearEnvironments();
        } finally {
            const destroyedAction: IRunnerResolverHostDestroyedAction = {
                type: RunnerResolverHostAction.DESTROYED,
            }
            if (actionId) {
                this.actionController.sendActionResponse<IRunnerResolverHostDestroyedAction>({
                    ...destroyedAction,
                    id: actionId,
                });
            } else {
                this.actionController.sendAction<IRunnerResolverHostDestroyedAction>(destroyedAction);
            }
            this.actionController.destroy();
            this.onDestroy();
        }
    }

    protected buildRunnerEnvironmentHost(
        config: IRunnerEnvironmentHostConfig
    ): RunnerEnvironmentHost<RunnerConstructor> {
        return new RunnerEnvironmentHost(config);
    }
    
    private buildRunnerEnvironmentHostByPartConfig(
        config: Pick<IRunnerEnvironmentHostConfig, 'token' | 'connectionChannel'>
    ): RunnerEnvironmentHost<RunnerConstructor> {
        const runnerEnvironmentHost = this.buildRunnerEnvironmentHost({
            errorSerializer: this.errorSerializer,
            runnerIdentifierConfigCollection: this.runnerIdentifierConfigCollection,
            argumentSerializer: this.argumentSerializer,
            argumentDeserializer: this.argumentDeserializer,
            connectionStrategy: this.connectionStrategy,
            onDestroyed: () => this.runnerEnvironmentHosts.delete(runnerEnvironmentHost),
            ...config,
        });
        return runnerEnvironmentHost;
    }
        
    private handleAction = async (
        action: IRunnerResolverClientAction & IActionWithId,
    ): Promise<void> => {
        try {
            switch (action.type) {
                case RunnerResolverClientAction.INIT_RUNNER:
                case RunnerResolverClientAction.SOFT_INIT_RUNNER:
                    await this.initRunnerInstance(action);
                    break;
                case RunnerResolverClientAction.DESTROY:
                    await this.handleDestroy(action.id)
                    break;
                default:
                    throw new WorkerRunnerUnexpectedError({
                        message: 'Unexpected Action type for Host Runner Resolver',
                    });
            }
        } catch (error) {
            if ('id' in action) {
                const serializedError = this.errorSerializer.serialize(
                    this.errorSerializer.normalize(error, WorkerRunnerUnexpectedError),
                );
                this.actionController.sendActionResponse<IRunnerResolverHostErrorAction>({
                    type: RunnerResolverHostAction.ERROR,
                    id: action.id,
                    error: serializedError,
                });
            } else {
                throw error;
            }
        }
    }

    private async clearEnvironments(): Promise<void> {
        const possibleErrors = await allPromisesCollectErrors(
            [...this.runnerEnvironmentHosts]
                .map(runnerEnvironmentHost => runnerEnvironmentHost.handleDestroy())
        )
        this.runnerEnvironmentHosts.clear();
        if ('errors' in possibleErrors) {
            throw new RunnerResolverHostDestroyError({ 
                originalErrors: possibleErrors.errors,
            });
        }
    }
    
    private async initRunnerInstance(
        action: (IRunnerResolverClientInitRunnerAction | IRunnerResolverClientSoftInitRunnerAction) & IActionWithId,
    ): Promise<void> {
        try {
            const responseAction: (IRunnerResolverHostSoftRunnerInitedAction | IRunnerResolverHostRunnerInitedAction) & IActionWithId
                = action.type === RunnerResolverClientAction.SOFT_INIT_RUNNER
                    ? {
                        type: RunnerResolverHostAction.SOFT_RUNNER_INITED,
                        id: action.id,
                        methodsNames: this.runnerIdentifierConfigCollection.getRunnerMethodsNames(action.token),
                    }
                    : {
                        type: RunnerResolverHostAction.RUNNER_INITED,
                        id: action.id,
                    };
            const preparedData = this.connectionStrategy
                .prepareNewRunnerForSend(this.actionController.connectionChannel);
            Object.assign(responseAction, preparedData.attachData);
            const runnerEnvironmentHost = this.buildRunnerEnvironmentHostByPartConfig({
                token: action.token,
                connectionChannel: preparedData.connectionChannel,
            });
            try {
                await runnerEnvironmentHost.initAsync({ arguments: action.args });
            } catch (error) {
                runnerEnvironmentHost.cancel();
                throw error;
            }
            this.runnerEnvironmentHosts.add(runnerEnvironmentHost);
            this.actionController.sendActionResponse(responseAction);
        } catch (error: unknown) {
            throw this.errorSerializer.normalize(error, RunnerInitError, {
                message: WORKER_RUNNER_ERROR_MESSAGES.RUNNER_INIT_ERROR({
                    token: action.token,
                    runnerName: this.runnerIdentifierConfigCollection
                        .getRunnerConstructorSoft(action.token)?.name,
                }),
            });
        }
    }
}
