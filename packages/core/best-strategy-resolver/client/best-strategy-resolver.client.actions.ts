import { ConnectionStrategyEnum } from '../../connection-strategies/connection-strategy.enum';

export enum BestStrategyResolverClientActions {
    Connect = "CONNECT",
}

export interface IBestStrategyResolverClientConnectAction {
    type: BestStrategyResolverClientActions.Connect;
    strategies: Array<ConnectionStrategyEnum | string>;
}
