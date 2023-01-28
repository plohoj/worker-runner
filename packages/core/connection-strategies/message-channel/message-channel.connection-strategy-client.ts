import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { MessagePortConnectionChannel } from '../../connection-channels/message-port.connection-channel';
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
        currentChannel: BaseConnectionChannel,
        receivedData: DataForSendRunner,
    ): BaseConnectionChannel {
        return new MessagePortConnectionChannel({
            target: (receivedData satisfies DataForSendRunner as unknown as IMessageChannelConnectionRunnerSendData).port,
        });
    }

    protected override prepareRunnerForSendByConnectionChannel(
        currentChannel: BaseConnectionChannel,
        resolvedConnection: BaseConnectionChannel,
    ): IPreparedForSendRunnerDataClient {
        if (resolvedConnection instanceof MessagePortConnectionChannel) {
            const port = resolvedConnection.target;
            resolvedConnection.destroy(true);
            return {
                data: {port} satisfies IMessageChannelConnectionRunnerSendData as unknown as DataForSendRunner,
                transfer: [port as MessagePort],
                cancel: async () => {
                    const connectionChannel = new MessagePortConnectionChannel({target: port});
                    await RunnerEnvironmentClient.disconnectConnection(connectionChannel);
                    connectionChannel.destroy();
                }
            }
        }
        return super.prepareRunnerForSendByConnectionChannel(currentChannel, resolvedConnection);
    }

    protected prepareRunnerProxyForSend(): IPreparedForSendProxyRunnerData {
        const messageChannel = new MessageChannel();
        const proxyChannel = new MessagePortConnectionChannel({target: messageChannel.port1});
        proxyChannel.run();
        return {
            proxyChannel,
            data: {
                port: messageChannel.port2,
            } satisfies IMessageChannelConnectionRunnerSendData as unknown as DataForSendRunner,
            transfer: [messageChannel.port2],
        };
    }
}
