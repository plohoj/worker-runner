import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { ConnectionChannelProxyData, ProxyConnectionChannel } from '../../connection-channels/proxy.connection-channel';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { IdentifierGenerator, WorkerRunnerIdentifier } from '../../utils/identifier-generator';
import { BaseConnectionStrategyClient, DataForSendRunner, IPreparedForSendProxyRunnerData, PreparedDataIdentifier } from '../base/base.connection-strategy-client';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IRepeatConnectionClientRunnerProxySendData, IRepeatConnectionNewClientRunnerSendData, IRepeatConnectionRunnerSendData, RepeatConnectionClientRunnerSendDataFields } from './repeat-connection-prepared-data.interface';

export interface IRepeatConnectionStrategyClientConfig {
    identifierGenerator?: IdentifierGenerator;
}

export class RepeatConnectionStrategyClient extends BaseConnectionStrategyClient {

    public readonly type: ConnectionStrategyEnum = ConnectionStrategyEnum.Repeat;
    private readonly identifierGenerator!: IdentifierGenerator;
    private prepareRunnerProxyKey!: 
        | RepeatConnectionClientRunnerSendDataFields.ClientId
        | RepeatConnectionClientRunnerSendDataFields.HostId;
    private newRunnerProxySendDataKey!:
        | RepeatConnectionClientRunnerSendDataFields.NewClientId
        | RepeatConnectionClientRunnerSendDataFields.NewHostId;

    constructor(config?: IRepeatConnectionStrategyClientConfig) {
        super();
        this.identifierGenerator = config?.identifierGenerator || new IdentifierGenerator();
        this.registerProxyKey(RepeatConnectionClientRunnerSendDataFields.ClientId);
    }

    public resolveConnectionForRunner(
        currentChannel: BaseConnectionChannel,
        sendData: DataForSendRunner,
    ): BaseConnectionChannel {
        if (currentChannel instanceof ProxyConnectionChannel) {
            currentChannel = currentChannel.getRootOriginalChannel();
        }
        const proxyData: ConnectionChannelProxyData | undefined
            = this.getProxyDataForPrimaryField(
                sendData as unknown as IRepeatConnectionRunnerSendData,
                RepeatConnectionClientRunnerSendDataFields.ClientId,
                RepeatConnectionClientRunnerSendDataFields.NewClientId,
            )
            || this.getProxyDataForPrimaryField(
                sendData as unknown as IRepeatConnectionRunnerSendData,
                RepeatConnectionClientRunnerSendDataFields.HostId,
                RepeatConnectionClientRunnerSendDataFields.NewHostId,
            );
        if (!proxyData) {
            throw new WorkerRunnerUnexpectedError({
                message: 'Received unexpected data that was prepared to connect Runner'
            });
        }
        const connectionChannel: BaseConnectionChannel = new ProxyConnectionChannel(currentChannel, proxyData);
        return connectionChannel;
    }

    public registerProxyKey(prepareRunnerProxyKey:
        | RepeatConnectionClientRunnerSendDataFields.ClientId
        | RepeatConnectionClientRunnerSendDataFields.HostId = RepeatConnectionClientRunnerSendDataFields.ClientId
    ) {
        this.prepareRunnerProxyKey = prepareRunnerProxyKey;
        this.newRunnerProxySendDataKey
            = this.prepareRunnerProxyKey === RepeatConnectionClientRunnerSendDataFields.ClientId
                ? RepeatConnectionClientRunnerSendDataFields.NewClientId
                : RepeatConnectionClientRunnerSendDataFields.NewHostId;
    }

    protected prepareRunnerProxyForSend(currentChannel: BaseConnectionChannel): IPreparedForSendProxyRunnerData {
        const identifier: WorkerRunnerIdentifier = this.identifierGenerator.generate();
        const proxyChannel = new ProxyConnectionChannel(currentChannel, [this.prepareRunnerProxyKey, identifier]);
        const sendData = {
            [this.newRunnerProxySendDataKey]: identifier
        } as unknown as IRepeatConnectionClientRunnerProxySendData;
        return {
            proxyChannel,
            identifier: identifier as unknown as PreparedDataIdentifier,
            preparedData: {
                data: sendData as unknown as DataForSendRunner,
            },
        };
    }

    protected getIdentifierForPreparedData(sendData: DataForSendRunner): PreparedDataIdentifier {
        return (sendData as unknown as IRepeatConnectionNewClientRunnerSendData)
            .newClientId as unknown as PreparedDataIdentifier;
    }

    private getProxyDataForPrimaryField(
        sendData: IRepeatConnectionRunnerSendData,
        primaryField: RepeatConnectionClientRunnerSendDataFields,
        secondaryField: RepeatConnectionClientRunnerSendDataFields,
    ): ConnectionChannelProxyData | undefined {
        if (primaryField in sendData) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            return [primaryField, (sendData as any)[primaryField]];
        }
        if (secondaryField in sendData) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            return [primaryField, (sendData as any)[secondaryField]];
        }
    }
}
