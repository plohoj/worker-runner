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
    /**
     * Intermediate proxy connection channel data.
     *
     * An intermediate proxy channel is used when the current connection strategy
     * is not capable of establishing a connection bypassing the current connection
     * and needs to duplicate Action from the Runner client environment
     * through the current connection.
     *
     * Actions received on the original connection channel from the Runner environment
     * will be duplicated to the intermediate proxy channel connection.
     * Actions received on the intermediate proxy channel connection
     * will also be duplicated to the original connection channel from the Runner environment
     *
     * The intermediate proxy channel will proxy data over the current connection
     * (which is where the data for the connection to the intermediate proxy channel will be sent)
     */
    intermediateProxyChannel: IBaseConnectionChannel;
}

export abstract class BaseConnectionStrategyClient {

    // TODO handle destroy for strategy?
    public abstract readonly type: ConnectionStrategyEnum | string;

    /**
     * Prepares connection data to control Runner, to send a copy or transfer control.
     * Runner can be passed as an argument or as the result of a method execution.
     * If {@link RunnerEnvironmentClient} is marked as transferable, the instance will be removed from the collection.
     * @param currentChannel - current connection channel for Resolver (client only)
     * or Runner environment (client or host).
     * Through this connection channel the data of the new connection (when copying)
     * or data of the old connection (when transferring control) with {@link environment} will be sent.
     * @param environment - Runner's client environment for which a new connection will be created
     * or a proxy-connection will be created to the old connection
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

    /**
     * @param currentChannel - current connection channel for Resolver (client only)
     * or Runner environment (client or host).
     * Through this connection channel the data of the new connection (when copying)
     * or data of the old connection (when transferring control) with {@link RunnerEnvironmentClient} will be sent.
     * @param resolvedChannel - a connection channel that was obtained as a result of cloning or transferring Runner control
     * @returns 
     */
    protected prepareRunnerForSendByConnectionChannel(
        currentChannel: IBaseConnectionChannel,
        resolvedChannel: IBaseConnectionChannel,
    ): IPreparedForSendRunnerDataClient {
        if (currentChannel instanceof ProxyConnectionChannel) {
            currentChannel = currentChannel.getRootOriginalChannel();
        }
        const { data, intermediateProxyChannel, transfer } = this.prepareIntermediateProxy(currentChannel);
        intermediateProxyChannel.actionHandlerController.addHandler(action => resolvedChannel.sendAction(action));
        resolvedChannel.actionHandlerController.addHandler(action => intermediateProxyChannel.sendAction(action));
        intermediateProxyChannel.run();
        void RunnerEnvironmentClient.waitDisconnectedOrDestroyedAction(resolvedChannel).then(disconnectReason => {
            if (!intermediateProxyChannel.disconnectReason) {
                intermediateProxyChannel.destroy({ disconnectReason });
            }
            // eslint-disable-next-line promise/always-return
            if (!resolvedChannel.disconnectReason) {
                resolvedChannel.destroy({ disconnectReason });
            }
        });
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        intermediateProxyChannel.destroyFinishHandlerController.addHandler(async disconnectReason => {
            if (!resolvedChannel.disconnectReason) {
                await RunnerEnvironmentClient.disconnectConnection(resolvedChannel);
            }
            if (!resolvedChannel.disconnectReason) {
                resolvedChannel.destroy({ disconnectReason });
            }
        });
        resolvedChannel.destroyFinishHandlerController.addHandler(disconnectReason => {
            if (!intermediateProxyChannel.disconnectReason) {
                // TODO Send ConnectionLost Action to intermediateProxyChannel
                intermediateProxyChannel.destroy({ disconnectReason });
            }
        });
        return {
            data,
            transfer,
            cancel: async () => {
                const disconnectReason = DisconnectReason.ConnectionError
                if (!intermediateProxyChannel.disconnectReason) {
                    intermediateProxyChannel.destroy({ disconnectReason });
                }
                if (!resolvedChannel.disconnectReason) {
                    await RunnerEnvironmentClient.disconnectConnection(resolvedChannel);
                }
                if (!resolvedChannel.disconnectReason) {
                    resolvedChannel.destroy({ disconnectReason });
                }
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

    /**
     * Preparing intermediate proxy connection channel data.
     * 
     * An intermediate proxy channel is used when the current connection strategy
     * is not capable of establishing a connection bypassing the current connection
     * and needs to duplicate Action from the Runner client environment
     * through the current connection ({@link currentChannel}).
     * 
     * Actions received on the original connection channel from the Runner environment
     * will be duplicated to the intermediate proxy channel connection.
     * Actions received on the intermediate proxy channel connection
     * will also be duplicated to the original connection channel from the Runner environment
     * 
     * The intermediate proxy channel will proxy data over the current connection ({@link currentChannel})
     * (which is where the data for the connection to the intermediate proxy channel will be sent)
     * 
     * @param currentChannel - current connection channel for Resolver (client only)
     * or Runner environment (client or host).
     * Through this connection channel the data of the new connection (when copying)
     * or data of the old connection (when transferring control) with {@link RunnerEnvironmentClient} will be sent.
     */
    protected abstract prepareIntermediateProxy(currentChannel: IBaseConnectionChannel): IPreparedForSendProxyRunnerData;
}
