/**
 * Runner data that was sent by the client to the host in case of:
 * * Method/constructor argument;
 */
export interface IRepeatConnectionClientRunnerAttachData {
    clientId: number;
}

/**
 * Runner data that was sent by the host to the client in case of:
 * * Result of the method execution;
 * * Result of requesting new Runner using Resolver;
 */
export interface IRepeatConnectionHostRunnerAttachData {
    hostId: number;
}

// TODO implement
/**
 * The original connection to the original Runner instance goes through the HostResolver.
 * The HostResolver environment must find this instance and use its connection to shorten the action forwarding route
 */
export interface IRepeatConnectionTransferRunnerAttachData {
    transferId: number;
}

export type IRepeatConnectionRunnerAttachData =
    | IRepeatConnectionClientRunnerAttachData
    | IRepeatConnectionHostRunnerAttachData
    | IRepeatConnectionTransferRunnerAttachData;

export type RepeatConnectionRunnerAttachDataKeys = keyof (
    & IRepeatConnectionClientRunnerAttachData
    & IRepeatConnectionHostRunnerAttachData
    & IRepeatConnectionTransferRunnerAttachData
);
