import { ConnectionStrategyEnum } from '../../connection-strategies/connection-strategy.enum';
import { WorkerRunnerIdentifier } from '../../utils/identifier-generator';

export enum BestStrategyResolverClientActions {
    CONNECT = "CONNECT",
}

export interface IBestStrategyResolverClientConnectAction {
    type: BestStrategyResolverClientActions.CONNECT;
    id: WorkerRunnerIdentifier;
    strategies: Array<ConnectionStrategyEnum | string>;
}
