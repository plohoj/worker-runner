import { IRunnerSerializedArgument } from '../../types/runner-serialized-argument';

export enum RunnerEnvironmentClientAction {
    EXECUTE = 'EXECUTE',
    RESOLVE = 'RESOLVE',
    REQUEST_RUNNER_OWN_DATA = 'REQUEST_RUNNER_OWN_DATA',
}

export type IRunnerEnvironmentClientExecuteAction = {
    type: RunnerEnvironmentClientAction.EXECUTE;
    method: string;
    args: IRunnerSerializedArgument[];
    transfer?: Transferable[]
}

export type IRunnerEnvironmentClientResolveAction = {
    type: RunnerEnvironmentClientAction.RESOLVE;
}

export type IRunnerEnvironmentClientRequestRunnerOwnDataAction = {
    type: RunnerEnvironmentClientAction.REQUEST_RUNNER_OWN_DATA;
}

export type IRunnerEnvironmentClientAction
    = IRunnerEnvironmentClientExecuteAction
    | IRunnerEnvironmentClientResolveAction
    | IRunnerEnvironmentClientRequestRunnerOwnDataAction;
