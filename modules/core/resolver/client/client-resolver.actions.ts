import { RunnerToken } from "../../types/runner-identifier";
import { IRunnerSerializedArgument } from '../../types/runner-serialized-argument';

export enum ClientResolverAction {
    INIT_RUNNER = 'INIT_RUNNER',
    /** Installing a runner whose methods are not yet known. (Configuration only by token without class constructor) */
    INIT_SOFT_RUNNER = 'INIT_SOFT_RUNNER',
    RUNNER_DATA_REQUEST = 'RUNNER_DATA_REQUEST',
}

export interface IClientResolverInitRunnerAction {
    type: ClientResolverAction.INIT_RUNNER;
    token: RunnerToken;
    args: IRunnerSerializedArgument[];
    transfer: Transferable[]
}

export interface IClientResolverInitSoftRunnerAction {
    type: ClientResolverAction.INIT_SOFT_RUNNER;
    token: RunnerToken;
    args: IRunnerSerializedArgument[];
    transfer: Transferable[]
}

export interface IClientResolverRunnerDataRequestAction {
    type: ClientResolverAction.RUNNER_DATA_REQUEST;
    token: RunnerToken;
}

export type IClientResolverAction
    = IClientResolverInitRunnerAction
    | IClientResolverInitSoftRunnerAction
    | IClientResolverRunnerDataRequestAction;
