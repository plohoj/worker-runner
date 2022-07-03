import { BaseConnectionChannel } from '../../connection-channels/base.connection-channel';
import { RunnerEnvironmentClient } from '../../runner-environment/client/runner-environment.client';
import { RunnerConstructor } from '../../types/constructor';
import { TransferableJsonLike } from '../../types/json-like';
import { ConnectionStrategyEnum } from '../connection-strategy.enum';

/**
 * Fields that must be attached to an object with a serialized Runner as an argument
 * or to an action with the result of a method execution
 */
export interface IPreparedForSendRunnerAttachData {
    [dataField: string]: TransferableJsonLike,
}

export interface IPreparedForSendRunnerData {
    attachData: IPreparedForSendRunnerAttachData,
    transfer: Transferable[],
}

export abstract class BaseConnectionStrategyClient {
    public abstract readonly type: ConnectionStrategyEnum | string;

    /** Processing data from an action and building a connection for a new Runner control instance */
    public abstract resolveConnectionForRunner(
        /**
         * Can be original connection channel for Runner resolver client / Connection client
         * or modified for Environment client
         */
        currentConnection: BaseConnectionChannel,
        attachedData: IPreparedForSendRunnerAttachData,
    ): BaseConnectionChannel;

    /**
     * Preparing the Runner to send a copy or transfer data of the control as an argument or method execute result
     * If the {@link EnvironmentClient} is marked as transferable,
     * then the removal methods from the collection will be called.
     */
    public abstract prepareRunnerForSend(
        environment: RunnerEnvironmentClient<RunnerConstructor>,
    ): IPreparedForSendRunnerData | Promise<IPreparedForSendRunnerData>;

    /** Canceling submission of prepared data for control when an error occurs while preparing arguments */
    public abstract cancelSendPreparedRunnerData(
        environment: RunnerEnvironmentClient<RunnerConstructor>,
        attachedData: IPreparedForSendRunnerAttachData,
    ): void | Promise<void>
}
