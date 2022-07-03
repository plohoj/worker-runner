import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { RunnerEnvironmentClient } from '../../runner-environment/client/runner-environment.client';
import { RunnerConstructor } from '../../types/constructor';
import { BaseConnectionStrategyClient, IPreparedForSendRunnerAttachData, IPreparedForSendRunnerData } from '../base/base.connection-strategy-client';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';

export class RepeatConnectionStrategyClient extends BaseConnectionStrategyClient {
    public readonly type = ConnectionStrategyEnum.Repeat;

    public resolveConnectionForRunner(
        currentConnection: BaseConnectionChannel,
        preparedData: IPreparedForSendRunnerAttachData
    ): BaseConnectionChannel {
        throw new WorkerRunnerUnexpectedError({message: 'Method not implemented.'});
    }

    public prepareRunnerForSend(
        environment: RunnerEnvironmentClient<RunnerConstructor>,
    ): IPreparedForSendRunnerData | Promise<IPreparedForSendRunnerData> {
        throw new WorkerRunnerUnexpectedError({message: 'Method not implemented.'});
    }

    public cancelSendPreparedRunnerData(
        environment: RunnerEnvironmentClient<RunnerConstructor>,
        preparedData: IPreparedForSendRunnerAttachData,
    ): void | Promise<void> {
        throw new WorkerRunnerUnexpectedError({message: 'Method not implemented.'});
    }
}
