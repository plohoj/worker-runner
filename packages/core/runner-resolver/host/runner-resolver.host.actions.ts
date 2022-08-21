import { ISerializedError } from '../../plugins/error-serialization-plugin/base/error-serialization-plugin-data';

export enum RunnerResolverHostAction {
    RUNNER_INITED = 'RUNNER_INITED',
    /** Runner is initialized, a list of Runner methods will be sent additionally */
    SOFT_RUNNER_INITED = 'SOFT_RUNNER_INITED',
    /** Error while executing an action */
    ERROR = "ERROR",

    DESTROYED = 'DESTROYED',
}

export type IRunnerResolverHostRunnerInitedAction = {
    type: RunnerResolverHostAction.RUNNER_INITED;
}

export type IRunnerResolverHostSoftRunnerInitedAction = {
    type: RunnerResolverHostAction.SOFT_RUNNER_INITED;
    methodsNames: string[];
}

export type IRunnerResolverHostErrorAction = {
    type: RunnerResolverHostAction.ERROR;
    error: ISerializedError,
}

export type IRunnerResolverHostDestroyedAction = {
    type: RunnerResolverHostAction.DESTROYED;
}

export type IRunnerResolverHostAction =
    | IRunnerResolverHostRunnerInitedAction
    | IRunnerResolverHostSoftRunnerInitedAction
    | IRunnerResolverHostErrorAction
    | IRunnerResolverHostDestroyedAction;
