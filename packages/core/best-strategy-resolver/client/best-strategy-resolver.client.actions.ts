import { ConnectionStrategyEnum } from '../../connection-strategies/connection-strategy.enum';

export enum BestStrategyResolverClientActions {
    CONNECT = "CONNECT",
}

export interface IBestStrategyResolverClientConnectAction {
    type: BestStrategyResolverClientActions.CONNECT;
    strategies: Array<ConnectionStrategyEnum | string>;
}
