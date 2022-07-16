import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { ProxyConnectionChannel } from '../../connection-channels/proxy.connection-channel';
import { IdentifierGenerator } from '../../utils/identifier-generator';
import { IAttachDataForSendRunner } from '../base/base.connection-strategy-client';
import { BaseConnectionStrategyHost, IPreparedForSendRunnerDataWithConnectionChannel } from '../base/base.connection-strategy-host';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IRepeatConnectionNewHostRunnerAttachData, RepeatConnectionClientRunnerAttachDataFields } from './repeat-connection-prepared-data.interface';
import { RepeatConnectionStrategyClient } from './repeat.connection-strategy-client';

export class RepeatConnectionStrategyHost extends BaseConnectionStrategyHost{
    public readonly strategyClient = new RepeatConnectionStrategyClient();
    public readonly type = ConnectionStrategyEnum.Repeat;
    protected readonly identifierGenerator = new IdentifierGenerator();

    constructor() {
        super();
        this.strategyClient.run({
            identifierGenerator: this.identifierGenerator,
            prepareRunnerProxyKey: RepeatConnectionClientRunnerAttachDataFields.HostId,
        });
    }

    public prepareRunnerForSend(
        currentChannel: BaseConnectionChannel,
    ): IPreparedForSendRunnerDataWithConnectionChannel {
        if (currentChannel instanceof ProxyConnectionChannel) {
            currentChannel = currentChannel.getRootOriginalChannel();
        }
        const newHostId = this.identifierGenerator.generate();
        const proxyKey = RepeatConnectionClientRunnerAttachDataFields.HostId;
        const connectionChannel: BaseConnectionChannel = new ProxyConnectionChannel(currentChannel, [proxyKey, newHostId]);
        const attachData: IRepeatConnectionNewHostRunnerAttachData = {
            [RepeatConnectionClientRunnerAttachDataFields.NewHostId]: newHostId,
        };
        return {
            attachData: attachData as unknown as IAttachDataForSendRunner,
            connectionChannel,
        }
    }

    // TODO destroying proxied connection in repeat strategy by destroying RunnerResolverClient
}
