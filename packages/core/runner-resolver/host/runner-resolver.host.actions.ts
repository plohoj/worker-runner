export enum RunnerResolverHostAction {
    RUNNER_INITED = 'RUNNER_INITED',
    SOFT_RUNNER_INITED = 'SOFT_RUNNER_INITED',
}

export type IRunnerResolverHostRunnerInitedAction = {
    type: RunnerResolverHostAction.RUNNER_INITED;
    port: MessagePort;
    transfer: [MessagePort];
}

export type IRunnerResolverHostSoftRunnerInitedAction = {
    type: RunnerResolverHostAction.SOFT_RUNNER_INITED;
    methodsNames: string[],
    port: MessagePort;
    transfer: [MessagePort];
}

export type IRunnerResolverHostAction =
    | IRunnerResolverHostRunnerInitedAction
    | IRunnerResolverHostSoftRunnerInitedAction;
