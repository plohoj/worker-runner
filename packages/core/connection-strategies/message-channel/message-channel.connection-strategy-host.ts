import { MessagePortConnectionChannel } from '../../connection-channels/message-port.connection-channel';
import { BaseConnectionStrategyHost, IPreparedForSendRunnerDataHost } from '../base/base.connection-strategy-host';
import { DataForSendRunner } from "../base/prepared-for-send-data";
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IMessageChannelConnectionRunnerSendData } from './message-channel-connection-prepared-data';
import { MessageChannelConnectionStrategyClient } from './message-channel.connection-strategy-client';


export class MessageChannelConnectionStrategyHost extends BaseConnectionStrategyHost{
    public readonly strategyClient = new MessageChannelConnectionStrategyClient();
    public readonly type = ConnectionStrategyEnum.MessageChannel;

    public prepareRunnerForSend(): IPreparedForSendRunnerDataHost {
        const messageChannel = new MessageChannel();
        const sendData: IMessageChannelConnectionRunnerSendData = {
            port: messageChannel.port2
        }
        const preparedData: IPreparedForSendRunnerDataHost = {
            data: sendData satisfies IMessageChannelConnectionRunnerSendData as unknown as DataForSendRunner,
            connectionChannel: new MessagePortConnectionChannel({target: messageChannel.port1}),
            transfer: [messageChannel.port2],
        };
        return preparedData;
    }
}
