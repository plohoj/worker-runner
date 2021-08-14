export enum HostResolverAction {
    RUNNER_INITED = 'RUNNER_INITED',
    SOFT_RUNNER_INITED = 'SOFT_RUNNER_INITED',
}

export type IHostResolverRunnerInitedAction = {
    type: HostResolverAction.RUNNER_INITED;
    port: MessagePort;
    transfer: [MessagePort];
}

export type IHostResolverSoftRunnerInitedAction = {
    type: HostResolverAction.SOFT_RUNNER_INITED;
    methodsNames: string[],
    port: MessagePort;
    transfer: [MessagePort];
}

export type IHostResolverAction = IHostResolverRunnerInitedAction | IHostResolverSoftRunnerInitedAction;
