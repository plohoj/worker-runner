import { ISerializedErrorAction } from '../../errors/error.serializer';

export enum WorkerResolverAction {
    RUNNER_INITED = 'RUNNER_INITED',
    RUNNER_INIT_ERROR = 'RUNNER_INIT_ERROR',
}

export interface IWorkerResolverRunnerInitedAction {
    type: WorkerResolverAction.RUNNER_INITED;
    port: MessagePort;
    transfer: [MessagePort];
}

export type IWorkerResolverRunnerInitErrorAction = ISerializedErrorAction<WorkerResolverAction.RUNNER_INIT_ERROR>;

export type IWorkerResolverAction =  IWorkerResolverRunnerInitedAction | IWorkerResolverRunnerInitErrorAction;
