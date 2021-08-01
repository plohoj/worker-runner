import { RunnerToken } from "../../types/runner-identifier";
import { IRunnerSerializedArgument } from '../../types/runner-serialized-argument';

export enum ClientResolverAction {
    INIT_RUNNER = 'INIT_RUNNER',
    /** Installing a runner whose methods are not yet known. */
    SOFT_INIT_RUNNER = 'SOFT_INIT_RUNNER',
}

export interface IClientResolverInitRunnerAction {
    type: ClientResolverAction.INIT_RUNNER;
    token: RunnerToken;
    args: IRunnerSerializedArgument[];
    transfer: Transferable[]
}

export interface IClientResolverSoftInitRunnerAction {
    type: ClientResolverAction.SOFT_INIT_RUNNER;
    token: RunnerToken;
    args: IRunnerSerializedArgument[];
    transfer: Transferable[]
}


export type IClientResolverAction
    = IClientResolverInitRunnerAction
    | IClientResolverSoftInitRunnerAction;
