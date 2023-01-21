import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { ProxyConnectionChannel } from '../../connection-channels/proxy.connection-channel';
import { RunnerEnvironmentClient } from '../../runner-environment/client/runner-environment.client';
import { Nominal } from '../../types/nominal';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';

declare const dataForSendRunner: unique symbol;
/**
 * Fields that must be attached to an object with a serialized Runner as an argument
 * or to an action with the result of a method execution
 */
export type DataForSendRunner = Nominal<typeof dataForSendRunner>;

export interface IPreparedForSendRunnerData {
    data: DataForSendRunner,
    transfer?: Transferable[],
}

export interface IPreparedForSendProxyRunnerData {
    proxyChannel: BaseConnectionChannel;
    identifier: PreparedDataIdentifier;
    preparedData: IPreparedForSendRunnerData;
}

declare const preparedDataIdentifier: unique symbol;
export type PreparedDataIdentifier = Nominal<typeof preparedDataIdentifier>;

export abstract class BaseConnectionStrategyClient {

    // TODO handle destroy strategy?
    /** {identifier: resolvedConnection} */
    protected readonly resolvedConnectionMap = new Map<PreparedDataIdentifier, BaseConnectionChannel>();
    public abstract readonly type: ConnectionStrategyEnum | string;

    /**
     * Preparing the Runner to send a copy or transfer data of the control as an argument or method execute result
     * If the {@link EnvironmentClient} is marked as transferable,
     * then the removal methods from the collection will be called.
     */
    public prepareRunnerForSend(
        currentChannel: BaseConnectionChannel,
        environment: RunnerEnvironmentClient,
    ): IPreparedForSendRunnerData | Promise<IPreparedForSendRunnerData> {
        if (environment.isMarkedForTransfer) {
            return this.prepareRunnerForSendByConnectionChannel(currentChannel, environment.transferControl());
        }
        // TODO Check that the same strategy is used for environment
        return environment.cloneControl()
            .then((connectionChannel: BaseConnectionChannel) =>
                this.prepareRunnerForSendByConnectionChannel(currentChannel, connectionChannel),
            );
    }

    // TODO prepareRunnerForSend must return cancel method
    /** Canceling submission of prepared data for control when an error occurs while preparing arguments */
    public cancelSendAttachRunnerData(
        sendData: DataForSendRunner,
    ): void | Promise<void> {
        const resolvedConnection = this.resolvedConnectionMap.get(this.getIdentifierForPreparedData(sendData));
        if (!resolvedConnection) {
            return;
        }
        return RunnerEnvironmentClient.disconnectConnection(resolvedConnection);
    }

    protected prepareRunnerForSendByConnectionChannel(
        currentChannel: BaseConnectionChannel,
        resolvedChannel: BaseConnectionChannel,
    ): IPreparedForSendRunnerData {
        if (currentChannel instanceof ProxyConnectionChannel) {
            currentChannel = currentChannel.getRootOriginalChannel();
        }
        const preparedProxyData = this.prepareRunnerProxyForSend(currentChannel);
        preparedProxyData.proxyChannel.actionHandlerController.addHandler(action => resolvedChannel.sendAction(action));
        resolvedChannel.actionHandlerController.addHandler(action => preparedProxyData.proxyChannel.sendAction(action));
        // eslint-disable-next-line promise/always-return
        void RunnerEnvironmentClient.waitDisconnectedOrDestroyedAction(resolvedChannel).then(() => {
            preparedProxyData.proxyChannel.destroy();
            resolvedChannel.destroy();
            this.resolvedConnectionMap.delete(preparedProxyData.identifier);
        });
        this.resolvedConnectionMap.set(preparedProxyData.identifier, resolvedChannel);
        return preparedProxyData.preparedData;
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
        currentChannel: BaseConnectionChannel,
        receivedData: DataForSendRunner,
    ): BaseConnectionChannel;

    protected abstract prepareRunnerProxyForSend(currentChannel: BaseConnectionChannel): IPreparedForSendProxyRunnerData;
    protected abstract getIdentifierForPreparedData(sendData: DataForSendRunner): PreparedDataIdentifier;
}
