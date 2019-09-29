import { RunnerErrorCode } from "../errors/runners-errors";
import { StackTraceError } from "../errors/stacktrace-error";

export enum WorkerCommand {
    WORKER_INIT,
    WORKER_DESTROYED,
    WORKER_ERROR,

    RUNNER_INIT,
    RUNNER_EXECUTED,
    RUNNER_DESTROYED,
    
    RUNNER_INIT_ERROR,
    RUNNER_EXECUTE_ERROR,
    RUNNER_DESTROY_ERROR,
}

export interface IWorkerCommandWorkerInit {
    type: WorkerCommand.WORKER_INIT;
}

export interface IWorkerCommandRunnerInit {
    type: WorkerCommand.RUNNER_INIT;
    instanceId: number;
}

export interface IWorkerCommandRunnerResponse {
    type: WorkerCommand.RUNNER_EXECUTED;
    commandId: number;
    instanceId: number;
    response: any;
}

export interface IWorkerCommandRunnerDestroyed {
    type: WorkerCommand.RUNNER_DESTROYED;
    instanceId: number;
}

export type IWorkerCommandRunnerInitError = StackTraceError<{
    type: WorkerCommand.RUNNER_INIT_ERROR;
    errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_ERROR | RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND;
    instanceId: number;
}>;

export type IWorkerCommandRunnerExecuteError = StackTraceError<{
    type: WorkerCommand.RUNNER_EXECUTE_ERROR;
    errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR | RunnerErrorCode.RUNNER_EXECUTE_INSTANCE_NOT_FOUND,
    commandId: number;
    instanceId: number;
}>;

export type IWorkerCommandRunnerDestroyError = StackTraceError<{
    type: WorkerCommand.RUNNER_DESTROY_ERROR;
    errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR | RunnerErrorCode.RUNNER_DESTROY_INSTANCE_NOT_FOUND,
    instanceId: number;
}>;

export interface IWorkerCommandWorkerDestroyed {
    type: WorkerCommand.WORKER_DESTROYED;
};

export type IWorkerCommandWorkerError = StackTraceError<{
    type: WorkerCommand.WORKER_ERROR;
}>;

export type IWorkerCommand<T extends WorkerCommand = WorkerCommand> = Extract<
    IWorkerCommandWorkerInit | IWorkerCommandWorkerDestroyed | IWorkerCommandWorkerError
        | IWorkerCommandRunnerInit | IWorkerCommandRunnerResponse
        | IWorkerCommandRunnerDestroyed | IWorkerCommandRunnerInitError
        | IWorkerCommandRunnerExecuteError | IWorkerCommandRunnerDestroyError,
    {type: T}
>;
