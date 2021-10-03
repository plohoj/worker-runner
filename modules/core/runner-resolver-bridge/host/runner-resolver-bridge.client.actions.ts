export enum RunnerResolverBridgeHostAction {
    PING = 'PING',
    PONG = 'PONG',
    CONNECTED = 'CONNECTED',
}

export interface IRunnerResolverBridgeHostPingAction {
    type: RunnerResolverBridgeHostAction.PING;
}

export interface IRunnerResolverBridgeHostPongAction {
    type: RunnerResolverBridgeHostAction.PONG;
}

export interface IRunnerResolverBridgeHostConnectedAction {
    id: number;
    type: RunnerResolverBridgeHostAction.CONNECTED;
    port: MessagePort;
}

export type IRunnerResolverBridgeHostAction = IRunnerResolverBridgeHostPingAction
    | IRunnerResolverBridgeHostPongAction
    | IRunnerResolverBridgeHostConnectedAction;
