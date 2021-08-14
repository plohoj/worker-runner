import { IRunnerSerializedArgument } from '../../types/runner-serialized-argument';

export enum RunnerControllerAction {
    EXECUTE = 'EXECUTE',
    RESOLVE = 'RESOLVE',
    REQUEST_RUNNER_OWN_DATA = 'REQUEST_RUNNER_OWN_DATA',
}

export type IRunnerControllerExecuteAction = {
    type: RunnerControllerAction.EXECUTE;
    method: string;
    args: IRunnerSerializedArgument[];
    transfer?: Transferable[]
}

export type IRunnerControllerResolveAction = {
    type: RunnerControllerAction.RESOLVE;
}

export type IRunnerControllerRequestRunnerOwnDataAction = {
    type: RunnerControllerAction.REQUEST_RUNNER_OWN_DATA;
}

export type IRunnerControllerAction
    = IRunnerControllerExecuteAction
    | IRunnerControllerResolveAction
    | IRunnerControllerRequestRunnerOwnDataAction;
