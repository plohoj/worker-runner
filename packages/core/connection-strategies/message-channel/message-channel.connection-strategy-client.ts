import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { MessagePortConnectionChannel } from '../../connection-channels/message-port.connection-channel';
import { RunnerEnvironmentClient } from '../../runner-environment/client/runner-environment.client';
import { IMessagePortTarget } from '../../types/message-port-target.interface';
import { BaseConnectionStrategyClient, DataForSendRunner, IPreparedForSendProxyRunnerData, IPreparedForSendRunnerData, PreparedDataIdentifier } from '../base/base.connection-strategy-client';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IMessageChannelConnectionRunnerSendData } from './message-channel-connection-prepared-data.interface';

export class MessageChannelConnectionStrategyClient extends BaseConnectionStrategyClient {
    public readonly type: ConnectionStrategyEnum = ConnectionStrategyEnum.MessageChannel;

    public resolveConnectionForRunner(
        currentChannel: BaseConnectionChannel,
        receivedData: DataForSendRunner,
    ): BaseConnectionChannel {
        return new MessagePortConnectionChannel({
            target: (receivedData as unknown as IMessageChannelConnectionRunnerSendData).port,
        });
    }

    public override cancelSendAttachRunnerData(
        sendData: DataForSendRunner,
    ): void | Promise<void> {
        const port = this.getIdentifierForPreparedData(sendData);
        if (!this.resolvedConnectionMap.has(port)) { // The port was passed without building a proxy
            const connectionChannel = new MessagePortConnectionChannel({
                target: port as unknown as IMessagePortTarget
            });
            return RunnerEnvironmentClient.disconnectConnection(connectionChannel);
        }
        return super.cancelSendAttachRunnerData(sendData);
    }

    protected override prepareRunnerForSendByConnectionChannel(
        currentChannel: BaseConnectionChannel,
        resolvedConnection: BaseConnectionChannel,
    ): IPreparedForSendRunnerData {
        if (resolvedConnection instanceof MessagePortConnectionChannel) {
            const port = resolvedConnection.target;
            const sendData: IMessageChannelConnectionRunnerSendData = {
                port,
            };
            return {
                data: sendData as unknown as DataForSendRunner,
                transfer: [port as MessagePort],
            }
        }
        return super.prepareRunnerForSendByConnectionChannel(currentChannel, resolvedConnection);
    }

    protected prepareRunnerProxyForSend(): IPreparedForSendProxyRunnerData {
        const messageChannel = new MessageChannel();
        const proxyChannel = new MessagePortConnectionChannel({target: messageChannel.port1});
        proxyChannel.run();
        const sendData: IMessageChannelConnectionRunnerSendData = {
            port: messageChannel.port2,
        };
        return {
            identifier: messageChannel.port2 as unknown as PreparedDataIdentifier,
            proxyChannel,
            preparedData: {
                data: sendData as unknown as DataForSendRunner,
                transfer: [messageChannel.port2],
            },
        };
    }

    protected getIdentifierForPreparedData(sendData: DataForSendRunner): PreparedDataIdentifier {
        return (sendData as unknown as IMessageChannelConnectionRunnerSendData)
            .port as unknown as PreparedDataIdentifier;
    }
}
