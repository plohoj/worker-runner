import { IRunnerArgument } from '../types/runner-argument';

export enum RunnerControllerAction {
    INIT = 10,
    EXECUTE,
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

export interface IRunnerControllerDestroyAction {
    type: RunnerControllerAction.DESTROY;
    id: number;
}

export interface IRunnerControllerResolveAction {
    type: RunnerControllerAction.RESOLVE;
    id: number;
}

export type IRunnerControllerAction<T extends RunnerControllerAction = RunnerControllerAction> = Extract<
    IRunnerControllerInitAction | IRunnerControllerExecuteAction
        | IRunnerControllerDestroyAction | IRunnerControllerResolveAction,
    {type: T}
>;

