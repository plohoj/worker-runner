import { MessagePortConnectionChannel } from '../../connection-channels/message-port.connection-channel';
import { IAttachDataForSendRunner } from '../base/base.connection-strategy-client';
import { BaseConnectionStrategyHost, IPreparedForSendRunnerDataWithConnectionChannel } from '../base/base.connection-strategy-host';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IMessageChannelConnectionRunnerAttachData } from './message-channel-connection-prepared-data.interface';
import { MessageChannelConnectionStrategyClient } from './message-channel.connection-strategy-client';


export class MessageChannelConnectionStrategyHost extends BaseConnectionStrategyHost{
    public readonly strategyClient = new MessageChannelConnectionStrategyClient();
    public readonly type = ConnectionStrategyEnum.MessageChannel;

    public prepareRunnerForSend(): IPreparedForSendRunnerDataWithConnectionChannel {
        const messageChannel = new MessageChannel();
        const attachData: IMessageChannelConnectionRunnerAttachData = {
            port: messageChannel.port2
        }
        const preparedData: IPreparedForSendRunnerDataWithConnectionChannel = {
            attachData: attachData as unknown as IAttachDataForSendRunner,
            connectionChannel: new MessagePortConnectionChannel({target: messageChannel.port1}),
            transfer: [messageChannel.port2],
        };
        return preparedData;
    }
}
