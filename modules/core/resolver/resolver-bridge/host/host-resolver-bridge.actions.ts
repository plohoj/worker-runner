export enum HostResolverBridgeAction {
    CONNECTED = 'CONNECTED',
}

export interface IHostResolverBridgeConnectedAction {
    id: number;
    type: HostResolverBridgeAction.CONNECTED;
    port: MessagePort;
}
