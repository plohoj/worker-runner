import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { MessagePortConnectionChannel } from '../../connection-channels/message-port.connection-channel';
import { DisconnectReason } from '../../connections/base/disconnect-reason';
import { RunnerEnvironmentClient } from '../../runner-environment/client/runner-environment.client';
import { BaseConnectionStrategyClient, IPreparedForSendProxyRunnerData, IPreparedForSendRunnerDataClient } from '../base/base.connection-strategy-client';
import { DataForSendRunner } from "../base/prepared-for-send-data";
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IMessageChannelConnectionRunnerSendData } from './message-channel-connection-prepared-data';

// TODO should use MessageChannel for send new Runner arguments for resolve
// (Local resolver should serialize data for constructor)
export class MessageChannelConnectionStrategyClient extends BaseConnectionStrategyClient {
    public readonly type: ConnectionStrategyEnum = ConnectionStrategyEnum.MessageChannel;

    public resolveConnectionForRunner(
        currentChannel: IBaseConnectionChannel,
        receivedData: DataForSendRunner,
    ): IBaseConnectionChannel {
        return new MessagePortConnectionChannel({
            target: (receivedData satisfies DataForSendRunner as unknown as IMessageChannelConnectionRunnerSendData).port,
        });
    }

    protected override prepareRunnerForSendByConnectionChannel(
        currentChannel: IBaseConnectionChannel,
        resolvedConnection: IBaseConnectionChannel,
    ): IPreparedForSendRunnerDataClient {
        if (resolvedConnection instanceof MessagePortConnectionChannel) {
            const port = resolvedConnection.target;
            resolvedConnection.destroy({
                saveConnectionOpened: true,
                disconnectReason: DisconnectReason.ConnectionTransfer,
            });
            return {
                data: {port} satisfies IMessageChannelConnectionRunnerSendData as unknown as DataForSendRunner,
                transfer: [port as MessagePort],
                cancel: async () => {
                    const connectionChannel = new MessagePortConnectionChannel({target: port});
                    await RunnerEnvironmentClient.disconnectConnection(connectionChannel);
                    connectionChannel.destroy({ disconnectReason: DisconnectReason.ConnectionError });
                }
            }
        }
        return super.prepareRunnerForSendByConnectionChannel(currentChannel, resolvedConnection);
    }

    protected prepareRunnerProxyForSend(): IPreparedForSendProxyRunnerData {
        const messageChannel = new MessageChannel();
        const proxyChannel = new MessagePortConnectionChannel({target: messageChannel.port1});
        return {
            proxyChannel,
            data: {
                port: messageChannel.port2,
            } satisfies IMessageChannelConnectionRunnerSendData as unknown as DataForSendRunner,
            transfer: [messageChannel.port2],
        };
    }
}
