import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { MessagePortConnectionChannel } from '../../connection-channels/message-port.connection-channel';
import { RunnerEnvironmentClient } from '../../runner-environment/client/runner-environment.client';
import { IMessagePortTarget } from '../../types/message-port-target.interface';
import { BaseConnectionStrategyClient, IAttachDataForSendRunner, IPreparedForSendProxyRunnerData, IPreparedForSendRunnerData } from '../base/base.connection-strategy-client';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IMessageChannelConnectionRunnerAttachData } from './message-channel-connection-prepared-data.interface';

export class MessageChannelConnectionStrategyClient extends BaseConnectionStrategyClient {
    public readonly type: ConnectionStrategyEnum = ConnectionStrategyEnum.MessageChannel;

    public resolveConnectionForRunner(
        currentChannel: BaseConnectionChannel,
        attachedData: IAttachDataForSendRunner,
    ): BaseConnectionChannel {
        return new MessagePortConnectionChannel({
            target: (attachedData as unknown as IMessageChannelConnectionRunnerAttachData).port,
        });
    }

    public override cancelSendAttachRunnerData(
        attachedData: IAttachDataForSendRunner,
    ): void | Promise<void> {
        const port = this.getIdentifierForPreparedData(attachedData);
        if (!this.resolvedConnectionMap.has(port)) { // The port was passed without building a proxy
            const connectionChannel = new MessagePortConnectionChannel({target: port});
            return RunnerEnvironmentClient.disconnectConnection(connectionChannel);
        }
        return super.cancelSendAttachRunnerData(attachedData);
    }

    protected override prepareRunnerForSendByConnectionChannel(
        currentChannel: BaseConnectionChannel,
        resolvedConnection: BaseConnectionChannel,
    ): IPreparedForSendRunnerData {
        if (resolvedConnection instanceof MessagePortConnectionChannel) {
            const port = resolvedConnection.target;
            const attachData: IMessageChannelConnectionRunnerAttachData = {
                port,
            };
            return {
                attachData: attachData as unknown as IAttachDataForSendRunner,
                transfer: [port as MessagePort],
            }
        }
        return super.prepareRunnerForSendByConnectionChannel(currentChannel, resolvedConnection);
    }

    protected prepareRunnerProxyForSend(): IPreparedForSendProxyRunnerData {
        const messageChannel = new MessageChannel();
        const proxyChannel = new MessagePortConnectionChannel({target: messageChannel.port1});
        proxyChannel.run();
        const attachData: IMessageChannelConnectionRunnerAttachData = {
            port: messageChannel.port2,
        };
        return {
            identifier: messageChannel.port2,
            proxyChannel,
            preparedData: {
                attachData: attachData as unknown as IAttachDataForSendRunner,
                transfer: [messageChannel.port2],
            },
        };
    }

    protected getIdentifierForPreparedData(attachedData: IAttachDataForSendRunner): IMessagePortTarget {
        return (attachedData as unknown as IMessageChannelConnectionRunnerAttachData).port;
    }
}
