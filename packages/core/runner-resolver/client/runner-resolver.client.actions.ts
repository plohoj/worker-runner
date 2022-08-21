import { ICollectionTransferPluginSendArrayData } from '../../plugins/transfer-plugin/collection-transfer-plugin/collection-transfer-plugin-data';
import { RunnerToken } from "../../types/runner-identifier";

export enum RunnerResolverClientAction {
    INIT_RUNNER = 'INIT_RUNNER',
    /** Installing a runner whose methods are not yet known. */
    SOFT_INIT_RUNNER = 'SOFT_INIT_RUNNER',
    /**
     * Termination of connection with RunnerResolverHost.
     * All Runner instances will be destroyed for this connection,
     * but RunnerResolverHost will not be destroyed and will wait for new connections.
     * 
     * To destroy a RunnerResolverHost, must call the destroy method directly on the RunnerResolverHost instance.
     */
    DESTROY = "DESTROY",
}

export type IRunnerResolverClientInitRunnerAction = {
    type: RunnerResolverClientAction.INIT_RUNNER;
    token: RunnerToken;
    args: ICollectionTransferPluginSendArrayData;
}

export type IRunnerResolverClientSoftInitRunnerAction = {
    type: RunnerResolverClientAction.SOFT_INIT_RUNNER;
    token: RunnerToken;
    args: ICollectionTransferPluginSendArrayData;
}

export type IRunnerResolverClientDestroyAction = {
    type: RunnerResolverClientAction.DESTROY;
}

export type IRunnerResolverClientAction
    = IRunnerResolverClientInitRunnerAction
    | IRunnerResolverClientSoftInitRunnerAction
    | IRunnerResolverClientDestroyAction;
