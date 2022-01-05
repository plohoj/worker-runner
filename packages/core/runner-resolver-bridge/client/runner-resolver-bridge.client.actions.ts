export enum RunnerResolverBridgeClientAction {
    PING = 'PING',
    CONNECT = 'CONNECT',
}

export interface IRunnerResolverBridgeClientPingAction {
    type: RunnerResolverBridgeClientAction.PING;
}

export interface IRunnerResolverBridgeClientConnectAction {
    id: number;
    type: RunnerResolverBridgeClientAction.CONNECT;
}

export type IRunnerResolverBridgeClientAction = IRunnerResolverBridgeClientPingAction | IRunnerResolverBridgeClientConnectAction;
