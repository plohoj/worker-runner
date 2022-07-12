import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { ProxyConnectionChannel } from '../../connection-channels/proxy.connection-channel';
import { IAttachDataForSendRunner } from '../base/base.connection-strategy-client';
import { BaseConnectionStrategyHost, IPreparedForSendRunnerDataWithConnectionChannel } from '../base/base.connection-strategy-host';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { IRepeatConnectionHostRunnerAttachData, RepeatConnectionRunnerAttachDataKeys } from './repeat-connection-prepared-data.interface';
import { RepeatConnectionStrategyClient } from './repeat.connection-strategy-client';

export class RepeatConnectionStrategyHost extends BaseConnectionStrategyHost{
    public readonly strategyClient = new RepeatConnectionStrategyClient();
    public readonly type = ConnectionStrategyEnum.Repeat;
    private lastRunnerId = 0;

    public prepareRunnerForSend(
        currentChannel: BaseConnectionChannel,
    ): IPreparedForSendRunnerDataWithConnectionChannel {
        if (currentChannel instanceof ProxyConnectionChannel) {
            currentChannel = currentChannel.getRootOriginalChannel();
        }
        const hostId = this.resolveRunnerId();
        const proxyKey: RepeatConnectionRunnerAttachDataKeys = 'hostId';
        const connectionChannel: BaseConnectionChannel = new ProxyConnectionChannel(currentChannel, [proxyKey, hostId]);
        const attachData: IRepeatConnectionHostRunnerAttachData = {hostId};
        return {
            attachData: attachData as unknown as IAttachDataForSendRunner,
            connectionChannel,
        }
    }

    // TODO Inject id generator
    private resolveRunnerId(): number {
        return this.lastRunnerId++;
    }

    // TODO destroying proxied connection in repeat strategy by destroying RunnerResolverClient
}
