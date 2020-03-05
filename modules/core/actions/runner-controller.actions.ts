import { IRunnerArgument } from '../types/runner-argument';

export enum RunnerControllerAction {
    INIT = 10,  // TODO move to NodeResolverAction
    EXECUTE,
    DISCONNECT,
    DESTROY,
    RESOLVE,
}

export interface IRunnerControllerInitAction {
    type: RunnerControllerAction.INIT;
    id: number;
    runnerId: number;
    args: IRunnerArgument[];
}

export interface IRunnerControllerExecuteAction {
    type: RunnerControllerAction.EXECUTE;
    id: number;
    method: string;
    args: IRunnerArgument[];
}

export interface IRunnerControllerDisconnectAction {
    type: RunnerControllerAction.DISCONNECT;
    id: number;
}

export interface IRunnerControllerDestroyAction {
    type: RunnerControllerAction.DESTROY;
    id: number;
}

export interface IRunnerControllerResolveAction {
    type: RunnerControllerAction.RESOLVE;
    id: number;
}

export type IRunnerControllerAction<T extends RunnerControllerAction = RunnerControllerAction> = Extract<
    IRunnerControllerInitAction | IRunnerControllerExecuteAction | IRunnerControllerDisconnectAction
        | IRunnerControllerDestroyAction | IRunnerControllerResolveAction,
    {type: T}
>;

