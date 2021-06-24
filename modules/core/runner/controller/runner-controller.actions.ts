import { IRunnerSerializedArgument } from '../../types/runner-serialized-argument';

export enum RunnerControllerAction {
    EXECUTE = 'EXECUTE',
    RESOLVE = 'RESOLVE',
}

export interface IRunnerControllerExecuteAction {
    type: RunnerControllerAction.EXECUTE;
    method: string;
    args: IRunnerSerializedArgument[];
    transfer?: Transferable[]
}

export interface IRunnerControllerResolveAction {
    type: RunnerControllerAction.RESOLVE;
}

export type IRunnerControllerAction = IRunnerControllerExecuteAction | IRunnerControllerResolveAction;

