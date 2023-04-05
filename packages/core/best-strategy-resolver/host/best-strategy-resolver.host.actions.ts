import { ConnectionStrategyEnum } from '../../connection-strategies/connection-strategy.enum';

export enum BestStrategyResolverHostActions {
    Ping = "PING",
    Connected = "CONNECTED",
}

export interface IBestStrategyResolverHostPingAction {
    type: BestStrategyResolverHostActions.Ping;
}

export interface IBestStrategyResolverHostConnectedAction {
    type: BestStrategyResolverHostActions.Connected;
    strategies: Array<ConnectionStrategyEnum | string>;
}

export type IBestStrategyResolverHostAction =
    | IBestStrategyResolverHostPingAction
    | IBestStrategyResolverHostConnectedAction;
