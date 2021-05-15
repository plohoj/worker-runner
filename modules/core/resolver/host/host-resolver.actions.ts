import { ISerializedErrorAction } from '../../errors/error.serializer';

export enum HostResolverAction {
    RUNNER_INITED = 'RUNNER_INITED',
    SOFT_RUNNER_INITED = 'SOFT_RUNNER_INITED',
    RUNNER_INIT_ERROR = 'RUNNER_INIT_ERROR',
}

export interface IHostResolverRunnerInitedAction {
    type: HostResolverAction.RUNNER_INITED;
    port: MessagePort;
    transfer: [MessagePort];
}

export interface IHostResolverSoftRunnerInitedAction {
    type: HostResolverAction.SOFT_RUNNER_INITED;
    methodNames: string[],
    port: MessagePort;
    transfer: [MessagePort];
}

export type IHostResolverRunnerInitErrorAction = ISerializedErrorAction<HostResolverAction.RUNNER_INIT_ERROR>;

export type IHostResolverAction
    =  IHostResolverRunnerInitedAction
    | IHostResolverRunnerInitErrorAction
    | IHostResolverSoftRunnerInitedAction;
