import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { RunnerEnvironmentHost } from '../../runner-environment/host/runner-environment.host';
import { RunnerConstructor } from '../../types/constructor';
import { IRunnerSerializedRunnerArgument } from '../../types/runner-serialized-argument';
import { BaseConnectionStrategyHost, IPreparedForSendRunnerDataWithConnectionChannel } from '../base/base.connection-strategy-host';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { RepeatConnectionStrategyClient } from './repeat.connection-strategy-client';


export class RepeatConnectionStrategyHost extends BaseConnectionStrategyHost{
    public readonly strategyClient = new RepeatConnectionStrategyClient();
    public readonly type = ConnectionStrategyEnum.Repeat;

    public resolveConnectionForRunnerAsArgument(
        data: IRunnerSerializedRunnerArgument
    ): BaseConnectionChannel {
        throw new WorkerRunnerUnexpectedError({message: 'Method not implemented.'});
    }

    public prepareClonedRunnerForSend(
        environment: RunnerEnvironmentHost<RunnerConstructor>,
    ): IPreparedForSendRunnerDataWithConnectionChannel {
        throw new WorkerRunnerUnexpectedError({message: 'Method not implemented.'});
    }

    public prepareNewRunnerForSend(
        currentConnection: BaseConnectionChannel,
    ): IPreparedForSendRunnerDataWithConnectionChannel {
        // TODO generate cloneId for repeat strategy
        throw new WorkerRunnerUnexpectedError({message: 'Method not implemented.'});
    }
    
    // TODO destroying proxied connection in repeat strategy by destroying RunnerResolverClient
}
