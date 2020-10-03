export enum WorkerResolverBridgeAction {
    CONNECTED = 'CONNECTED',
}

export interface IWorkerResolverBridgeConnectedAction {
    id: number;
    type: WorkerResolverBridgeAction.CONNECTED;
    port: MessagePort;
}
