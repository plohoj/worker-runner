import { WorkerRunnerIdentifier } from '../../utils/identifier-generator';

export enum RepeatConnectionClientRunnerSendDataFields {
    NewClientId = 'newClientId',
    ClientId = 'clientId',
    NewHostId = 'newHostId',
    HostId = 'hostId',
    TransferId = 'transferId',
}

/**
 * Data for a **new** connection with the runner. The data that was sent by the client to the host in case of:
 * * Method/constructor argument;
 */
export interface IRepeatConnectionNewClientRunnerSendData {
    [RepeatConnectionClientRunnerSendDataFields.NewClientId]: WorkerRunnerIdentifier;
}

/**
 * Data for an **existing** connection to the runner. The data that was sent by the client to the host in case of:
 * * Method/constructor argument;
 */
export interface IRepeatConnectionClientRunnerProxySendData {
    [RepeatConnectionClientRunnerSendDataFields.ClientId]: WorkerRunnerIdentifier;
}

/**
 * Data for a **new** connection with the runner. The data that was sent by the client to the host in case of:
 * * Result of the method execution;
 * * Result of requesting new Runner using Resolver;
 * * Result on a connection clone request
 */
export interface IRepeatConnectionNewHostRunnerSendData {
    [RepeatConnectionClientRunnerSendDataFields.NewHostId]: WorkerRunnerIdentifier;
}

/**
 * Data for an **existing** connection to the runner. The data that was sent by the host to the client in case of:
 * * Result of the method execution;
 * * Result of requesting new Runner using Resolver;
 * * Result on a connection clone request
 */
export interface IRepeatConnectionHostRunnerProxySendData {
    [RepeatConnectionClientRunnerSendDataFields.HostId]: WorkerRunnerIdentifier;
}

// TODO implement
/**
 * The original connection to the original Runner instance goes through the HostResolver.
 * The HostResolver environment must find this instance and use its connection to shorten the action forwarding route
 */
export interface IRepeatConnectionTransferRunnerSendData {
    [RepeatConnectionClientRunnerSendDataFields.TransferId]: WorkerRunnerIdentifier;
}

export type IRepeatConnectionRunnerSendData =
    | IRepeatConnectionNewClientRunnerSendData    
    | IRepeatConnectionClientRunnerProxySendData
    | IRepeatConnectionNewHostRunnerSendData
    | IRepeatConnectionHostRunnerProxySendData
    | IRepeatConnectionTransferRunnerSendData;

export type RepeatConnectionRunnerSendDataKeys = keyof (
    & IRepeatConnectionNewClientRunnerSendData
    & IRepeatConnectionClientRunnerProxySendData
    & IRepeatConnectionNewHostRunnerSendData
    & IRepeatConnectionHostRunnerProxySendData
    & IRepeatConnectionTransferRunnerSendData
);
