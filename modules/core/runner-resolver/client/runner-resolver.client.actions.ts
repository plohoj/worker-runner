import { RunnerToken } from "../../types/runner-identifier";
import { IRunnerSerializedArgument } from '../../types/runner-serialized-argument';

export enum RunnerResolverClientAction {
    INIT_RUNNER = 'INIT_RUNNER',
    /** Installing a runner whose methods are not yet known. */
    SOFT_INIT_RUNNER = 'SOFT_INIT_RUNNER',
}

export type IRunnerResolverClientInitRunnerAction = {
    type: RunnerResolverClientAction.INIT_RUNNER;
    token: RunnerToken;
    args: IRunnerSerializedArgument[];
    transfer: Transferable[]
}

export type IRunnerResolverClientSoftInitRunnerAction = {
    type: RunnerResolverClientAction.SOFT_INIT_RUNNER;
    token: RunnerToken;
    args: IRunnerSerializedArgument[];
    transfer: Transferable[]
}


export type IRunnerResolverClientAction
    = IRunnerResolverClientInitRunnerAction
    | IRunnerResolverClientSoftInitRunnerAction;
