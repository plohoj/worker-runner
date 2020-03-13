import { RunnerErrorCode } from '../errors/runners-errors';
import { StackTraceError } from '../errors/stacktrace-error';

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

export type IWorkerResolverRunnerInitErrorAction = StackTraceError<{
    type: WorkerResolverAction.RUNNER_INIT_ERROR;
    errorCode: RunnerErrorCode.RUNNER_INIT_ERROR;
    id: number;
}>;

export interface IWorkerResolverDestroyedAction {
    type: WorkerResolverAction.DESTROYED;
}

export type IWorkerResolverAction<T extends WorkerResolverAction = WorkerResolverAction> = Extract<
    IWorkerResolverWorkerInitedAction | IWorkerResolverDestroyedAction
        | IWorkerResolverRunnerInitedAction | IWorkerResolverRunnerInitErrorAction,
    {type: T}
>;
