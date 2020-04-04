import { ISerializedErrorAction } from '../errors/error.serializer';

export enum WorkerResolverAction {
    WORKER_INITED,
    RUNNER_INITED,
    RUNNER_INIT_ERROR,
    DESTROYED,
}

export interface IWorkerResolverWorkerInitedAction {
    type: WorkerResolverAction.WORKER_INITED;
}

export interface IWorkerResolverRunnerInitedAction {
    type: WorkerResolverAction.RUNNER_INITED;
    id: number;
    port: MessagePort;
}

export type IWorkerResolverRunnerInitErrorAction = ISerializedErrorAction<WorkerResolverAction.RUNNER_INIT_ERROR>;

export interface IWorkerResolverDestroyedAction {
    type: WorkerResolverAction.DESTROYED;
}

export type IWorkerResolverAction<T extends WorkerResolverAction = WorkerResolverAction> = Extract<
    IWorkerResolverWorkerInitedAction | IWorkerResolverDestroyedAction
        | IWorkerResolverRunnerInitedAction | IWorkerResolverRunnerInitErrorAction,
    {type: T}
>;
