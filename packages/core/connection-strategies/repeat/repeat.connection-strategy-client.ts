import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { ConnectionChannelProxyData, ProxyConnectionChannel } from '../../connection-channels/proxy.connection-channel';
import { WorkerRunnerUnexpectedError } from '../../errors/worker-runner-error';
import { IdentifierGenerator, WorkerRunnerIdentifier } from '../../utils/identifier-generator';
import { BaseConnectionStrategyClient, IPreparedForSendProxyRunnerData } from '../base/base.connection-strategy-client';
import { DataForSendRunner } from "../base/prepared-for-send-data";
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IRepeatConnectionRunnerSendData, RepeatConnectionClientRunnerSendDataFields } from './repeat-connection-prepared-data';

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
                sendData satisfies DataForSendRunner as unknown as IRepeatConnectionRunnerSendData,
                RepeatConnectionClientRunnerSendDataFields.ClientId,
                RepeatConnectionClientRunnerSendDataFields.NewClientId,
            )
            || this.getProxyDataForPrimaryField(
                sendData satisfies DataForSendRunner as unknown as IRepeatConnectionRunnerSendData,
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
        return {
            proxyChannel,
            data: {[this.newRunnerProxySendDataKey]: identifier} as unknown as DataForSendRunner,
        };
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
