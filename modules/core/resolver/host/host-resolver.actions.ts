import { ISerializedErrorAction } from '../../errors/error.serializer';

export enum HostResolverAction {
    RUNNER_INITED = 'RUNNER_INITED',
    SOFT_RUNNER_INITED = 'SOFT_RUNNER_INITED',
    RUNNER_INIT_ERROR = 'RUNNER_INIT_ERROR',
    RUNNER_DATA_RESPONSE = 'RUNNER_DATA_RESPONSE',
    RUNNER_DATA_RESPONSE_ERROR = 'RUNNER_DATA_RESPONSE_ERROR',
}

export interface IHostResolverRunnerInitedAction {
    type: HostResolverAction.RUNNER_INITED;
    port: MessagePort;
    transfer: [MessagePort];
}

export interface IHostResolverSoftRunnerInitedAction {
    type: HostResolverAction.SOFT_RUNNER_INITED;
    methodsNames: string[],
    port: MessagePort;
    transfer: [MessagePort];
}

export type IHostResolverRunnerInitErrorAction = ISerializedErrorAction<HostResolverAction.RUNNER_INIT_ERROR>;

export interface IHostResolverRunnerDataResponseAction {
    type: HostResolverAction.RUNNER_DATA_RESPONSE;
    methodsNames: string[],
}

export type IHostResolverRunnerDataResponseErrorAction = ISerializedErrorAction<HostResolverAction.RUNNER_DATA_RESPONSE_ERROR>;

export type IHostResolverAction
    = IHostResolverRunnerInitedAction
    | IHostResolverRunnerInitErrorAction
    | IHostResolverSoftRunnerInitedAction
    | IHostResolverRunnerDataResponseAction
    | IHostResolverRunnerDataResponseErrorAction;
