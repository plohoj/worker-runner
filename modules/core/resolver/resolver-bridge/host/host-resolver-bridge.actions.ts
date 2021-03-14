export enum HostResolverBridgeAction {
    PING = 'PING',
    PONG = 'PONG',
    CONNECTED = 'CONNECTED',
}

export interface IHostResolverBridgePingAction {
    type: HostResolverBridgeAction.PING;
}

export interface IHostResolverBridgePongAction {
    type: HostResolverBridgeAction.PONG;
}

export interface IHostResolverBridgeConnectedAction {
    id: number;
    type: HostResolverBridgeAction.CONNECTED;
    port: MessagePort;
}

export type IHostResolverBridgeAction = IHostResolverBridgePingAction
    | IHostResolverBridgePongAction
    | IHostResolverBridgeConnectedAction;
