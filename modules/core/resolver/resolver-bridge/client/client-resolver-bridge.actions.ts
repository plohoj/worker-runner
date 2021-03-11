export enum ClientResolverBridgeAction {
    CONNECT = 'CONNECT',
    DISCONNECT = 'DISCONNECT',
    DESTROY = 'DESTROY',
}

export interface IClientResolverBridgeConnectAction {
    id: number;
    type: ClientResolverBridgeAction.CONNECT;
}

export interface IClientResolverBridgeDisconnectAction {
    id: number;
    type: ClientResolverBridgeAction.DISCONNECT;
}

export interface IClientResolverBridgeDestroyAction {
    id: number;
    type: ClientResolverBridgeAction.DESTROY;
}
