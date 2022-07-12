import { BaseConnectionChannel } from '../connection-channels/base.connection-channel';
import { BaseConnectionStrategyClient } from '../connection-strategies/base/base.connection-strategy-client';
import { WorkerRunnerMultipleError } from "../errors/worker-runner-error";
import { RunnerEnvironmentClient, RunnerEnvironmentClientPartFactory } from "../runner-environment/client/runner-environment.client";
import { IRunnerSerializedParameter, RunnerConstructor } from "../types/constructor";
import { IRunnerSerializedArgument, RunnerSerializedArgumentTypeEnum } from "../types/runner-serialized-argument";
import { allPromisesCollectErrors, mapPromisesAndAwaitMappedWhenError } from "../utils/all-promises-collect-errors";

export interface IArgumentsDeserializerConfig {
    connectionStrategy: BaseConnectionStrategyClient;
}

export interface IDeserializedArgumentsData {
    arguments: IRunnerSerializedParameter[];
    environments: RunnerEnvironmentClient<RunnerConstructor>[];
}

export class ArgumentsDeserializer {

    private readonly connectionStrategy: BaseConnectionStrategyClient;

    constructor(config: IArgumentsDeserializerConfig) {
        this.connectionStrategy = config.connectionStrategy;
    }

    async deserializeArguments(config: {
        arguments: IRunnerSerializedArgument[],
        baseConnection: BaseConnectionChannel,
        runnerEnvironmentClientPartFactory: RunnerEnvironmentClientPartFactory<RunnerConstructor>;
        combinedErrorsFactory(errors: unknown[]): WorkerRunnerMultipleError,
    }): Promise<IDeserializedArgumentsData> {
        const environments = new Array<RunnerEnvironmentClient<RunnerConstructor>>();
        const connectionChannels = new Array<BaseConnectionChannel>();
        const deserializedArgumentsWithPossibleErrors = await mapPromisesAndAwaitMappedWhenError(
            config.arguments,
            async (argument): Promise<IRunnerSerializedParameter> => {
                switch (argument.type) {
                    case RunnerSerializedArgumentTypeEnum.RUNNER: {
                        let environment: RunnerEnvironmentClient<RunnerConstructor>;
                        const connectionChannel = this.connectionStrategy
                            .resolveConnectionForRunner(config.baseConnection, argument);
                        try {
                            environment = await config.runnerEnvironmentClientPartFactory({
                                connectionChannel,
                                token: argument.token,
                            });
                        } catch (error: unknown) {
                            // The ConnectionChannel running will be called in the disconnectConnection method
                            await RunnerEnvironmentClient.disconnectConnection(connectionChannel);
                            connectionChannel.destroy();
                            throw error;
                        }
                        connectionChannels.push(connectionChannel);
                        environments.push(environment);
                        return environment.resolvedRunner;
                    }
                    default:
                        return argument.data;
                }
            },
        );
        
        if (deserializedArgumentsWithPossibleErrors.errors.length > 0) {
            const allErrors = new Array<unknown>();
            allErrors.push(...deserializedArgumentsWithPossibleErrors.errors);
            const disconnectedOrErrors =  await allPromisesCollectErrors([
                ...connectionChannels.map(async connectionChannel => {
                    // The ConnectionChannel running will be called  in the disconnectConnection method
                    await RunnerEnvironmentClient.disconnectConnection(connectionChannel);
                    connectionChannel.destroy();
                }),
                ...environments.map(environment => environment.disconnect()),
            ]);
            if ('errors' in disconnectedOrErrors) {
                allErrors.push(...disconnectedOrErrors.errors);
            }
            // TODO NEED TEST
            throw config.combinedErrorsFactory(allErrors);
        }
    
        return {
            arguments: deserializedArgumentsWithPossibleErrors.mapped,
            environments,
        };
    }
}

