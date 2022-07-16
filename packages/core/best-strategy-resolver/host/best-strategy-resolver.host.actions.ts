import { ConnectionStrategyEnum } from '../../connection-strategies/connection-strategy.enum';

export enum BestStrategyResolverHostActions {
    PING = "PING",
    CONNECTED = "CONNECTED",
}

export interface IBestStrategyResolverHostPingAction {
    type: BestStrategyResolverHostActions.PING;
}

export interface IBestStrategyResolverHostConnectedAction {
    type: BestStrategyResolverHostActions.CONNECTED;
    strategies: Array<ConnectionStrategyEnum | string>;
}

export type IBestStrategyResolverHostAction =
    | IBestStrategyResolverHostPingAction
    | IBestStrategyResolverHostConnectedAction;
