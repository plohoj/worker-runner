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
    type: WorkerCommand.RUNNER_INIT_ERROR,
    error: any;
    instanceId: number;
}

export type IWorkerCommand<T extends WorkerCommand = WorkerCommand> = Extract<
    IWorkerCommandWorkerInit | IWorkerCommandRunnerInit | IWorkerCommandRunnerResponse
        | IWorkerCommandRunnerDestroyed | IWorkerCommandRunnerInitError,
    {type: T}
>;
