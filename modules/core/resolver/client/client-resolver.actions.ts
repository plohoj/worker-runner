import { IRunnerArgument } from '../../types/runner-argument';
import { RunnerToken } from "../../types/runner-token";

export enum ClientResolverAction {
    INIT_RUNNER = 'INIT_RUNNER',
    /** Installing a runner whose methods are not yet known. (Configuration only by token without class constructor) */
    INIT_SOFT_RUNNER = 'INIT_SOFT_RUNNER',
}

export interface IClientResolverInitRunnerAction {
    type: ClientResolverAction.INIT_RUNNER;
    token: RunnerToken;
    args: IRunnerArgument[];
    transfer: Transferable[]
}

export interface IClientResolverInitSoftRunnerAction {
    type: ClientResolverAction.INIT_SOFT_RUNNER;
    token: RunnerToken;
    args: IRunnerArgument[];
    transfer: Transferable[]
}

export type IClientResolverAction =  IClientResolverInitRunnerAction | IClientResolverInitSoftRunnerAction;
