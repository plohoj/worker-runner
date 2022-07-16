import { WorkerRunnerIdentifier } from '../../utils/identifier-generator';

export enum RepeatConnectionClientRunnerAttachDataFields {
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
export interface IRepeatConnectionNewClientRunnerAttachData {
    [RepeatConnectionClientRunnerAttachDataFields.NewClientId]: WorkerRunnerIdentifier;
}

/**
 * Data for an **existing** connection to the runner. The data that was sent by the client to the host in case of:
 * * Method/constructor argument;
 */
export interface IRepeatConnectionClientRunnerProxyAttachData {
    [RepeatConnectionClientRunnerAttachDataFields.ClientId]: WorkerRunnerIdentifier;
}

/**
 * Data for a **new** connection with the runner. The data that was sent by the client to the host in case of:
 * * Result of the method execution;
 * * Result of requesting new Runner using Resolver;
 * * Result on a connection clone request
 */
export interface IRepeatConnectionNewHostRunnerAttachData {
    [RepeatConnectionClientRunnerAttachDataFields.NewHostId]: WorkerRunnerIdentifier;
}

/**
 * Data for an **existing** connection to the runner. The data that was sent by the host to the client in case of:
 * * Result of the method execution;
 * * Result of requesting new Runner using Resolver;
 * * Result on a connection clone request
 */
export interface IRepeatConnectionHostRunnerProxyAttachData {
    [RepeatConnectionClientRunnerAttachDataFields.HostId]: WorkerRunnerIdentifier;
}

// TODO implement
/**
 * The original connection to the original Runner instance goes through the HostResolver.
 * The HostResolver environment must find this instance and use its connection to shorten the action forwarding route
 */
export interface IRepeatConnectionTransferRunnerAttachData {
    [RepeatConnectionClientRunnerAttachDataFields.TransferId]: WorkerRunnerIdentifier;
}

export type IRepeatConnectionRunnerAttachData =
    | IRepeatConnectionNewClientRunnerAttachData    
    | IRepeatConnectionClientRunnerProxyAttachData
    | IRepeatConnectionNewHostRunnerAttachData
    | IRepeatConnectionHostRunnerProxyAttachData
    | IRepeatConnectionTransferRunnerAttachData;

export type RepeatConnectionRunnerAttachDataKeys = keyof (
    & IRepeatConnectionNewClientRunnerAttachData
    & IRepeatConnectionClientRunnerProxyAttachData
    & IRepeatConnectionNewHostRunnerAttachData
    & IRepeatConnectionHostRunnerProxyAttachData
    & IRepeatConnectionTransferRunnerAttachData
);
