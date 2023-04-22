import { ConnectionStrategyEnum } from '../../connection-strategies/connection-strategy.enum';

export enum BestStrategyResolverClientActions {
    Ping = "PING",
    Connect = "CONNECT",
}

export interface IBestStrategyResolverClientPingAction {
    type: BestStrategyResolverClientActions.Ping;
}

export interface IBestStrategyResolverClientConnectAction {
    type: BestStrategyResolverClientActions.Connect;
    strategies: Array<ConnectionStrategyEnum | string>;
}

export type IBestStrategyResolverClientAction
    = IBestStrategyResolverClientPingAction
    | IBestStrategyResolverClientConnectAction;
