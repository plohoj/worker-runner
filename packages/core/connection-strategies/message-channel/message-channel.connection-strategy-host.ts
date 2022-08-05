import { MessagePortConnectionChannel } from '../../connection-channels/message-port.connection-channel';
import { DataForSendRunner } from '../base/base.connection-strategy-client';
import { BaseConnectionStrategyHost, IPreparedForSendRunnerDataWithConnectionChannel } from '../base/base.connection-strategy-host';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IMessageChannelConnectionRunnerSendData } from './message-channel-connection-prepared-data.interface';
import { MessageChannelConnectionStrategyClient } from './message-channel.connection-strategy-client';


export class MessageChannelConnectionStrategyHost extends BaseConnectionStrategyHost{
    public readonly strategyClient = new MessageChannelConnectionStrategyClient();
    public readonly type = ConnectionStrategyEnum.MessageChannel;

    public prepareRunnerForSend(): IPreparedForSendRunnerDataWithConnectionChannel {
        const messageChannel = new MessageChannel();
        const sendData: IMessageChannelConnectionRunnerSendData = {
            port: messageChannel.port2
        }
        const preparedData: IPreparedForSendRunnerDataWithConnectionChannel = {
            data: sendData as unknown as DataForSendRunner,
            connectionChannel: new MessagePortConnectionChannel({target: messageChannel.port1}),
            transfer: [messageChannel.port2],
        };
        return preparedData;
    }
}
