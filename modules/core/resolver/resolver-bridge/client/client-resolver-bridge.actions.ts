export enum ClientResolverBridgeAction {
    PING = 'PING',
    CONNECT = 'CONNECT',
}


export interface IClientResolverBridgePingAction {
    type: ClientResolverBridgeAction.PING;
}

export interface IClientResolverBridgeConnectAction {
    id: number;
    type: ClientResolverBridgeAction.CONNECT;
}

export type IClientResolverBridgeAction = IClientResolverBridgePingAction | IClientResolverBridgeConnectAction;
