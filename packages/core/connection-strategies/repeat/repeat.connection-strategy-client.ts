import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { ProxyConnectionChannel } from '../../connection-channels/proxy.connection-channel';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { BaseConnectionStrategyClient, IAttachDataForSendRunner, IPreparedForSendProxyRunnerData } from '../base/base.connection-strategy-client';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IRepeatConnectionClientRunnerAttachData, IRepeatConnectionRunnerAttachData, RepeatConnectionRunnerAttachDataKeys } from './repeat-connection-prepared-data.interface';

export class RepeatConnectionStrategyClient extends BaseConnectionStrategyClient {

    public readonly type: ConnectionStrategyEnum = ConnectionStrategyEnum.Repeat;

    private lastRunnerId = 0;

    public resolveConnectionForRunner(
        currentChannel: BaseConnectionChannel,
        attachedData: IAttachDataForSendRunner,
    ): BaseConnectionChannel {
        if (currentChannel instanceof ProxyConnectionChannel) {
            currentChannel = currentChannel.getRootOriginalChannel();
        }
        const connectionField: RepeatConnectionRunnerAttachDataKeys | false
            = this.checkField(attachedData as unknown as IRepeatConnectionRunnerAttachData, 'clientId')
            || this.checkField(attachedData as unknown as IRepeatConnectionRunnerAttachData, 'hostId')
            || this.checkField(attachedData as unknown as IRepeatConnectionRunnerAttachData, 'transferId');
        if (!connectionField) {
            throw new WorkerRunnerUnexpectedError({
                message: 'Received unexpected data that was prepared to connect Runner'
            });
        }
        const connectionChannel: BaseConnectionChannel = new ProxyConnectionChannel(currentChannel, [
            connectionField,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            (attachedData as any)[connectionField],
        ]);
        return connectionChannel;
    }

    protected prepareRunnerProxyForSend(currentChannel: BaseConnectionChannel): IPreparedForSendProxyRunnerData {
        const proxyKey: RepeatConnectionRunnerAttachDataKeys = 'clientId';
        const clientId = this.resolveRunnerId();
        const proxyChannel = new ProxyConnectionChannel(currentChannel, [proxyKey, clientId]);
        const attachData: IRepeatConnectionClientRunnerAttachData = {clientId};
        return {
            proxyChannel,
            identifier: clientId,
            preparedData: {
                attachData: attachData as unknown as IAttachDataForSendRunner,
            }
        }
    }

    protected getIdentifierForPreparedData(attachedData: IAttachDataForSendRunner): unknown {
        return (attachedData as unknown as IRepeatConnectionClientRunnerAttachData).clientId
    }

    private checkField(
        attachedData: IRepeatConnectionRunnerAttachData,
        field: RepeatConnectionRunnerAttachDataKeys
    ): RepeatConnectionRunnerAttachDataKeys | false {
        if (field in attachedData) {
            return field;
        }
        return false;
    }

    // TODO Inject id generator
    private resolveRunnerId(): number {
        return this.lastRunnerId++;
    }
}
