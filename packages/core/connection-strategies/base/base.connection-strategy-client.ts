import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { ProxyConnectionChannel } from '../../connection-channels/proxy.connection-channel';
import { RunnerEnvironmentClient } from '../../runner-environment/client/runner-environment.client';
import { RunnerConstructor } from '../../types/constructor';
import { TransferableJsonLike } from '../../types/json-like';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';

/**
 * Fields that must be attached to an object with a serialized Runner as an argument
 * or to an action with the result of a method execution
 */
export interface IAttachDataForSendRunner {
    [dataField: string]: TransferableJsonLike,
}

export interface IPreparedForSendRunnerData {
    attachData: IAttachDataForSendRunner,
    transfer?: Transferable[],
}

export interface IPreparedForSendProxyRunnerData {
    proxyChannel: BaseConnectionChannel;
    identifier: PreparedDataIdentifier;
    preparedData: IPreparedForSendRunnerData;
}

export type PreparedDataIdentifier = 'FAKE_TYPE_FOR_PREPARED_DATA_IDENTIFIER' | symbol;

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
        environment: RunnerEnvironmentClient<RunnerConstructor>,
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

    /** Canceling submission of prepared data for control when an error occurs while preparing arguments */
    public cancelSendAttachRunnerData(
        attachData: IAttachDataForSendRunner,
    ): void | Promise<void> {
        const resolvedConnection = this.resolvedConnectionMap.get(this.getIdentifierForPreparedData(attachData));
        if (!resolvedConnection) {
            return;
        }
        return RunnerEnvironmentClient.disconnectConnection(resolvedConnection);
    }

    public run?(): void;

    protected prepareRunnerForSendByConnectionChannel(
        currentChannel: BaseConnectionChannel,
        resolvedChannel: BaseConnectionChannel,
    ): IPreparedForSendRunnerData {
        if (currentChannel instanceof ProxyConnectionChannel) {
            currentChannel = currentChannel.getRootOriginalChannel();
        }
        const preparedProxyData = this.prepareRunnerProxyForSend(currentChannel);
        preparedProxyData.proxyChannel.addActionHandler(action => resolvedChannel.sendAction(action));
        resolvedChannel.addActionHandler(action => preparedProxyData.proxyChannel.sendAction(action));
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
        attachedData: IAttachDataForSendRunner,
    ): BaseConnectionChannel;

    protected abstract prepareRunnerProxyForSend(currentChannel: BaseConnectionChannel): IPreparedForSendProxyRunnerData;
    protected abstract getIdentifierForPreparedData(attachedData: IAttachDataForSendRunner,): PreparedDataIdentifier;
}
