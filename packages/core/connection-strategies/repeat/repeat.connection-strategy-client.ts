import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { ConnectionChannelProxyData, ProxyConnectionChannel } from '../../connection-channels/proxy.connection-channel';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { IdentifierGenerator, WorkerRunnerIdentifier } from '../../utils/identifier-generator';
import { BaseConnectionStrategyClient, IAttachDataForSendRunner, IPreparedForSendProxyRunnerData, PreparedDataIdentifier } from '../base/base.connection-strategy-client';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IRepeatConnectionClientRunnerProxyAttachData, IRepeatConnectionNewClientRunnerAttachData, IRepeatConnectionRunnerAttachData, RepeatConnectionClientRunnerAttachDataFields } from './repeat-connection-prepared-data.interface';

export interface IRepeatConnectionStrategyClientRunConfig {
    identifierGenerator?: IdentifierGenerator;
    prepareRunnerProxyKey?:
        | RepeatConnectionClientRunnerAttachDataFields.ClientId
        | RepeatConnectionClientRunnerAttachDataFields.HostId;
}

export class RepeatConnectionStrategyClient extends BaseConnectionStrategyClient {

    public readonly type: ConnectionStrategyEnum = ConnectionStrategyEnum.Repeat;
    private identifierGenerator!: IdentifierGenerator;
    private prepareRunnerProxyKey: 
        | RepeatConnectionClientRunnerAttachDataFields.ClientId
        | RepeatConnectionClientRunnerAttachDataFields.HostId
        = RepeatConnectionClientRunnerAttachDataFields.ClientId;
    private newRunnerProxyAttachDataKey:
        | RepeatConnectionClientRunnerAttachDataFields.NewClientId
        | RepeatConnectionClientRunnerAttachDataFields.NewHostId
        = RepeatConnectionClientRunnerAttachDataFields.NewClientId;

    public resolveConnectionForRunner(
        currentChannel: BaseConnectionChannel,
        attachedData: IAttachDataForSendRunner,
    ): BaseConnectionChannel {
        if (currentChannel instanceof ProxyConnectionChannel) {
            currentChannel = currentChannel.getRootOriginalChannel();
        }
        const proxyData: ConnectionChannelProxyData | undefined
            = this.getProxyDataForPrimaryField(
                attachedData as unknown as IRepeatConnectionRunnerAttachData,
                RepeatConnectionClientRunnerAttachDataFields.ClientId,
                RepeatConnectionClientRunnerAttachDataFields.NewClientId,
            )
            || this.getProxyDataForPrimaryField(
                attachedData as unknown as IRepeatConnectionRunnerAttachData,
                RepeatConnectionClientRunnerAttachDataFields.HostId,
                RepeatConnectionClientRunnerAttachDataFields.NewHostId,
            );
        if (!proxyData) {
            throw new WorkerRunnerUnexpectedError({
                message: 'Received unexpected data that was prepared to connect Runner'
            });
        }
        const connectionChannel: BaseConnectionChannel = new ProxyConnectionChannel(currentChannel, proxyData);
        return connectionChannel;
    }

    public override run(config: IRepeatConnectionStrategyClientRunConfig = {}) {
        this.identifierGenerator = config.identifierGenerator || new IdentifierGenerator();
        if (config.prepareRunnerProxyKey) {
            this.prepareRunnerProxyKey = config.prepareRunnerProxyKey;
            this.newRunnerProxyAttachDataKey
                = this.prepareRunnerProxyKey === RepeatConnectionClientRunnerAttachDataFields.ClientId
                ? RepeatConnectionClientRunnerAttachDataFields.NewClientId
                : RepeatConnectionClientRunnerAttachDataFields.NewHostId;
        }
    }

    protected prepareRunnerProxyForSend(currentChannel: BaseConnectionChannel): IPreparedForSendProxyRunnerData {
        const identifier: WorkerRunnerIdentifier = this.identifierGenerator.generate();
        const proxyChannel = new ProxyConnectionChannel(currentChannel, [this.prepareRunnerProxyKey, identifier]);
        const attachData = {
            [this.newRunnerProxyAttachDataKey]: identifier
        } as unknown as IRepeatConnectionClientRunnerProxyAttachData;
        return {
            proxyChannel,
            identifier: identifier as unknown as PreparedDataIdentifier,
            preparedData: {
                attachData: attachData as unknown as IAttachDataForSendRunner,
            },
        };
    }

    protected getIdentifierForPreparedData(attachedData: IAttachDataForSendRunner): PreparedDataIdentifier {
        return (attachedData as unknown as IRepeatConnectionNewClientRunnerAttachData)
            .newClientId as unknown as PreparedDataIdentifier;
    }

    private getProxyDataForPrimaryField(
        attachedData: IRepeatConnectionRunnerAttachData,
        primaryField: RepeatConnectionClientRunnerAttachDataFields,
        secondaryField: RepeatConnectionClientRunnerAttachDataFields,
    ): ConnectionChannelProxyData | undefined {
        if (primaryField in attachedData) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            return [primaryField, (attachedData as any)[primaryField]];
        }
        if (secondaryField in attachedData) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            return [primaryField, (attachedData as any)[secondaryField]];
        }
    }
}
