import { IBaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { ProxyConnectionChannel } from '../../connection-channels/proxy.connection-channel';
import { DisconnectReason } from '../../connections/base/disconnect-reason';
import { RunnerEnvironmentClient } from '../../runner-environment/client/runner-environment.client';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';
import { DataForSendRunner, IPreparedForSendRunnerDataBase } from './prepared-for-send-data';

export interface IPreparedForSendRunnerDataClient extends IPreparedForSendRunnerDataBase {
    /** Canceling sending prepared data for control if an error occurs before sending */
    cancel: () => void | Promise<void>,
}

export interface IPreparedForSendProxyRunnerData extends IPreparedForSendRunnerDataBase {
    proxyChannel: IBaseConnectionChannel;
}

export abstract class BaseConnectionStrategyClient {

    // TODO handle destroy for strategy?
    public abstract readonly type: ConnectionStrategyEnum | string;

    /**
     * Preparing the Runner to send a copy or transfer data of the control as an argument or method execute result
     * If the {@link EnvironmentClient} is marked as transferable,
     * then the removal methods from the collection will be called.
     */
    public prepareRunnerForSend(
        currentChannel: IBaseConnectionChannel,
        environment: RunnerEnvironmentClient,
    ): IPreparedForSendRunnerDataClient | Promise<IPreparedForSendRunnerDataClient> {
        if (environment.isMarkedForTransfer) {
            return this.prepareRunnerForSendByConnectionChannel(currentChannel, environment.transferControl());
        }
        // TODO Check that the same strategy is used for environment
        return environment.cloneControl()
            .then((connectionChannel: IBaseConnectionChannel) =>
                this.prepareRunnerForSendByConnectionChannel(currentChannel, connectionChannel),
            );
    }

    protected prepareRunnerForSendByConnectionChannel(
        currentChannel: IBaseConnectionChannel,
        /** A connection channel that was obtained as a result of cloning or transferring Runner control */
        resolvedChannel: IBaseConnectionChannel,
    ): IPreparedForSendRunnerDataClient {
        if (currentChannel instanceof ProxyConnectionChannel) {
            currentChannel = currentChannel.getRootOriginalChannel();
        }
        const preparedProxyData = this.prepareRunnerProxyForSend(currentChannel);
        preparedProxyData.proxyChannel.actionHandlerController.addHandler(action => resolvedChannel.sendAction(action));
        resolvedChannel.actionHandlerController.addHandler(action => preparedProxyData.proxyChannel.sendAction(action));
        preparedProxyData.proxyChannel.run();
        // eslint-disable-next-line promise/always-return
        void RunnerEnvironmentClient.waitDisconnectedOrDestroyedAction(resolvedChannel).then((disconnectReason) => {
            preparedProxyData.proxyChannel.destroy({ disconnectReason });
            resolvedChannel.destroy({ disconnectReason });
        });
        return {
            data: preparedProxyData.data,
            transfer: preparedProxyData.transfer,
            cancel: async () => {
                const disconnectReason = DisconnectReason.ConnectionError
                preparedProxyData.proxyChannel.destroy({ disconnectReason });
                await RunnerEnvironmentClient.disconnectConnection(resolvedChannel);
                resolvedChannel.destroy({ disconnectReason });
            }
        };
    }

    /**
     * Get the connection for the Runner, which is received as:
     * * Result of the method execution (client side);
     * * Result of requesting new Runner using Resolver (client side);
     * * Method/constructor argument (host side);
     * 
     * **WARNING**: For all cases, a Runner can be received after being marked as a transfer.
     */
    public abstract resolveConnectionForRunner(
        /**
         * Can be original connection channel for Runner resolver client / Connection client
         * or modified for Environment client
         */
        currentChannel: IBaseConnectionChannel,
        receivedData: DataForSendRunner,
    ): IBaseConnectionChannel;

    protected abstract prepareRunnerProxyForSend(currentChannel: IBaseConnectionChannel): IPreparedForSendProxyRunnerData;
}
