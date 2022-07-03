import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { MessagePortConnectionChannel } from '../../connection-channels/message-port.connection-channel';
import { RunnerEnvironmentClient } from '../../runner-environment/client/runner-environment.client';
import { RunnerConstructor } from '../../types/constructor';
import { BaseConnectionStrategyClient, IPreparedForSendRunnerData } from '../base/base.connection-strategy-client';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IMessageChannelConnectionPreparedForSendRunnerAttachData } from './message-channel-connection-prepared-data.interface';

export class MessageChannelConnectionStrategyClient extends BaseConnectionStrategyClient {
    public readonly type = ConnectionStrategyEnum.MessageChannel;

    public resolveConnectionForRunner(
        currentConnection: BaseConnectionChannel,
        attachedData: IMessageChannelConnectionPreparedForSendRunnerAttachData,
    ): BaseConnectionChannel {
        return new MessagePortConnectionChannel({target: attachedData.port});
    }

    public prepareRunnerForSend(
        environment: RunnerEnvironmentClient<RunnerConstructor>,
    ): IPreparedForSendRunnerData {
        let port: MessagePort;
        if (environment.isMarkedForTransfer) {
            // TODO Check that the same strategy is used for environment
            const connection = environment.transferControl() as MessagePortConnectionChannel;
            port = connection.target as MessagePort;
        } else {
            // TODO Check that the same strategy is used for environment
            port = (environment.cloneControl() as unknown as IMessageChannelConnectionPreparedForSendRunnerAttachData)
                .port;
        }
        const attachData: IMessageChannelConnectionPreparedForSendRunnerAttachData = {
            port,
        };
        const prepareData: IPreparedForSendRunnerData = {
            attachData,
            transfer: [port],
        }
        return prepareData;
    }

    // TODO Needed?
    public cancelSendPreparedRunnerData(
        environment: RunnerEnvironmentClient<RunnerConstructor>,
        attachedData: IMessageChannelConnectionPreparedForSendRunnerAttachData,
    ): void | Promise<void> {
        if (environment.isMarkedForTransfer) {
            return environment.disconnect();
        }
    }
}
