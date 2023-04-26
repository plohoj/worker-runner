export enum DisconnectReason {
    ConnectionNotYetEstablished = 'NotYetEstablished',
    /** An error occurred while establishing a connection */
    ConnectionError = 'ConnectionError',
    ConnectionLost = 'ConnectionLost',
    /** Control of the original connection channel has been transferred to another connection instance */
    ConnectionTransfer = 'ConnectionTransfer',
    ResolverDestroyed = 'ResolverDestroyed',
    RunnerDestroyed = 'RunnerDestroyed',
    RunnerDisconnected = 'RunnerDisconnected',
    RunnerTransfer = 'RunnerTransfer',
}
