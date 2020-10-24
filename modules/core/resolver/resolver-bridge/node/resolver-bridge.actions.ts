export enum ResolverBridgeAction {
    CONNECT = 'CONNECT',
    DISCONNECT = 'DISCONNECT',
    DESTROY = 'DESTROY',
}

export interface IResolverBridgeConnectAction {
    id: number;
    type: ResolverBridgeAction.CONNECT;
}

export interface IResolverBridgeDisconnectAction {
    id: number;
    type: ResolverBridgeAction.DISCONNECT;
}

export interface IResolverBridgeDestroyAction {
    id: number;
    type: ResolverBridgeAction.DESTROY;
}
