import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { MessagePortConnectionChannel } from '../../connection-channels/message-port.connection-channel';
import { RunnerEnvironmentHost } from '../../runner-environment/host/runner-environment.host';
import { RunnerConstructor } from '../../types/constructor';
import { BaseConnectionStrategyHost, IPreparedForSendRunnerDataWithConnectionChannel } from '../base/base.connection-strategy-host';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IMessageChannelConnectionPreparedForSendRunnerAttachData } from './message-channel-connection-prepared-data.interface';
import { MessageChannelConnectionStrategyClient } from './message-channel.connection-strategy-client';


export class MessageChannelConnectionStrategyHost extends BaseConnectionStrategyHost{
    public readonly strategyClient = new MessageChannelConnectionStrategyClient();
    public readonly type = ConnectionStrategyEnum.MessageChannel;

    public resolveConnectionForRunnerAsArgument(
        preparedData: IMessageChannelConnectionPreparedForSendRunnerAttachData
    ): BaseConnectionChannel {
        return new MessagePortConnectionChannel({target: preparedData.port});
    }

    public prepareClonedRunnerForSend(
        environment: RunnerEnvironmentHost<RunnerConstructor>,
    ): IPreparedForSendRunnerDataWithConnectionChannel {
        return this.prepareRunnerForSend();
    }

    public prepareNewRunnerForSend(
        currentConnection: BaseConnectionChannel,
    ): IPreparedForSendRunnerDataWithConnectionChannel {
        return this.prepareRunnerForSend();
    }

    private prepareRunnerForSend(): IPreparedForSendRunnerDataWithConnectionChannel {
        const messageChannel = new MessageChannel();
        const attachData: IMessageChannelConnectionPreparedForSendRunnerAttachData = {
            port: messageChannel.port2
        }
        const preparedData: IPreparedForSendRunnerDataWithConnectionChannel = {
            attachData,
            connectionChannel: new MessagePortConnectionChannel({target: messageChannel.port1}),
            transfer: [messageChannel.port2],
        };
        return preparedData;
    }
}
