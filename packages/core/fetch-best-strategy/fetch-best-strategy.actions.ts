import { ConnectionStrategyEnum } from '../connection-strategies/connection-strategy.enum';

export enum FetchBestStrategyActions {
    CONNECT = "CONNECT",
    CONNECTED = "CONNECTED",
}

export interface IFetchBestStrategyConnectAction {
    type: FetchBestStrategyActions.CONNECT;
    strategies: Array<ConnectionStrategyEnum | string>;
}

export interface IFetchBestStrategyConnectedAction {
    type: FetchBestStrategyActions.CONNECTED;
    strategies: Array<ConnectionStrategyEnum | string>;
}

export type IFetchBestStrategyAction =
    | IFetchBestStrategyConnectAction
    | IFetchBestStrategyConnectedAction;
