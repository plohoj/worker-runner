import { WorkerErrorCode } from "./worker-error-code";

export enum WorkerCommand {
    WORKER_INIT,
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
    response: any;
}

export interface IWorkerCommandRunnerInitError {
    type: WorkerCommand.RUNNER_INIT_ERROR;
    error: any;
    errorCode: WorkerErrorCode.RUNNER_INIT_CONSTRUCTOR_ERROR | WorkerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND;
    instanceId: number;
}

export interface IWorkerCommandRunnerExecuteError {
    type: WorkerCommand.RUNNER_EXECUTE_ERROR;
    error: any;
    errorCode: WorkerErrorCode.RUNNER_EXECUTE_ERROR | WorkerErrorCode.RUNNER_EXECUTE_INSTANCE_NOT_FOUND,
    commandId: number;
    instanceId: number;
}

export interface IWorkerCommandRunnerDestroyError {
    type: WorkerCommand.RUNNER_DESTROY_ERROR;
    error: any;
    errorCode: WorkerErrorCode.RUNNER_DESTROY_ERROR | WorkerErrorCode.RUNNER_DESTROY_INSTANCE_NOT_FOUND,
    instanceId: number;
}

export type IWorkerCommand<T extends WorkerCommand = WorkerCommand> = Extract<
    IWorkerCommandWorkerInit | IWorkerCommandRunnerInit | IWorkerCommandRunnerResponse
        | IWorkerCommandRunnerDestroyed | IWorkerCommandRunnerInitError
        | IWorkerCommandRunnerExecuteError | IWorkerCommandRunnerDestroyError,
    {type: T}
>;
