export enum WorkerCommand {
    ON_WORKER_INIT,
    ON_RUNNER_INIT,
    RUNNER_RESPONSE
}

export interface IWorkerCommandOnWorkerInit {
    type: WorkerCommand.ON_WORKER_INIT;
}

export interface IWorkerCommandOnRunnerInit {
    type: WorkerCommand.ON_RUNNER_INIT;
    runnerId: number;
}

export interface IWorkerCommandRunnerResponse {
    type: WorkerCommand.RUNNER_RESPONSE;
    id: number;
    runnerId: number;
    response: any;
}

export type IWorkerCommand<T extends WorkerCommand = WorkerCommand> = Extract<
    IWorkerCommandOnWorkerInit | IWorkerCommandOnRunnerInit | IWorkerCommandRunnerResponse,
    {type: T}
>;
