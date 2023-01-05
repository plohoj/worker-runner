import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { ProxyConnectionChannel } from '../../connection-channels/proxy.connection-channel';
import { IdentifierGenerator } from '../../utils/identifier-generator';
import { DataForSendRunner } from '../base/base.connection-strategy-client';
import { BaseConnectionStrategyHost, IPreparedForSendRunnerDataWithConnectionChannel } from '../base/base.connection-strategy-host';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IRepeatConnectionNewHostRunnerSendData, RepeatConnectionClientRunnerSendDataFields } from './repeat-connection-prepared-data.interface';
import { RepeatConnectionStrategyClient } from './repeat.connection-strategy-client';

export class RepeatConnectionStrategyHost extends BaseConnectionStrategyHost{
    public readonly strategyClient: RepeatConnectionStrategyClient;
    public readonly type = ConnectionStrategyEnum.Repeat;
    protected readonly identifierGenerator = new IdentifierGenerator();

    constructor() {
        super();
        this.strategyClient = new RepeatConnectionStrategyClient({
            identifierGenerator: this.identifierGenerator,
        });
        this.strategyClient.registerProxyKey(RepeatConnectionClientRunnerSendDataFields.HostId);
    }

    public prepareRunnerForSend(
        currentChannel: BaseConnectionChannel,
    ): IPreparedForSendRunnerDataWithConnectionChannel {
        if (currentChannel instanceof ProxyConnectionChannel) {
            currentChannel = currentChannel.getRootOriginalChannel();
        }
        const newHostId = this.identifierGenerator.generate();
        const proxyKey = RepeatConnectionClientRunnerSendDataFields.HostId;
        const connectionChannel: BaseConnectionChannel = new ProxyConnectionChannel(currentChannel, [proxyKey, newHostId]);
        const sendData: IRepeatConnectionNewHostRunnerSendData = {
            [RepeatConnectionClientRunnerSendDataFields.NewHostId]: newHostId,
        };
        return {
            data: sendData as unknown as DataForSendRunner,
            connectionChannel,
        }
    }

    // TODO destroying proxied connection in repeat strategy by destroying RunnerResolverClient
}
