export enum WorkerCommand {
    ON_WORKER_INIT,
    ON_RUNNER_INIT,
    RUNNER_RESPONSE,
    ON_RUNNER_DESTROYED,
}

export interface IWorkerCommandOnWorkerInit {
    type: WorkerCommand.ON_WORKER_INIT;
}

export interface IWorkerCommandOnRunnerInit {
    type: WorkerCommand.ON_RUNNER_INIT;
    instanceId: number;
}

export interface IWorkerCommandRunnerResponse {
    type: WorkerCommand.RUNNER_RESPONSE;
    commandId: number;
    instanceId: number;
    response: any;
}

export interface IWorkerCommandRunnerResponse {
    type: WorkerCommand.RUNNER_RESPONSE;
    commandId: number;
    instanceId: number;
    response: any;
}

export interface IWorkerCommandRunnerOnDestroyed {
    type: WorkerCommand.ON_RUNNER_DESTROYED;
    instanceId: number;
    response: any;
}

export type IWorkerCommand<T extends WorkerCommand = WorkerCommand> = Extract<
    IWorkerCommandOnWorkerInit | IWorkerCommandOnRunnerInit | IWorkerCommandRunnerResponse | IWorkerCommandRunnerOnDestroyed,
    {type: T}
>;
