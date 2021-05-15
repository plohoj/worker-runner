import { IRunnerArgument } from '../../types/runner-argument';

export enum RunnerControllerAction {
    EXECUTE = 'EXECUTE',
    RESOLVE = 'RESOLVE',
}

export interface IRunnerControllerExecuteAction {
    type: RunnerControllerAction.EXECUTE;
    method: string;
    args: IRunnerArgument[];
    transfer?: Transferable[]
}

export interface IRunnerControllerResolveAction {
    type: RunnerControllerAction.RESOLVE;
}

export type IRunnerControllerAction = IRunnerControllerExecuteAction | IRunnerControllerResolveAction;

